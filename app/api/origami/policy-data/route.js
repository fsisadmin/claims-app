import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function fetchAll(supabase, table, select, filters = {}, orderBy = null, ascending = false) {
  const PAGE_SIZE = 1000
  let allRows = []
  let from = 0
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1)
    if (orderBy) query = query.order(orderBy, { ascending })
    for (const [key, val] of Object.entries(filters)) {
      if (key.endsWith('_in')) {
        const col = key.replace('_in', '')
        query = query.in(col, val)
      } else {
        query = query.eq(key, val)
      }
    }
    const { data, error } = await query
    if (error) throw error
    allRows = allRows.concat(data || [])
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return allRows
}

export async function POST(request) {
  try {
    const { policyId, organizationId } = await request.json()
    if (!policyId || !organizationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Step 1: Fetch the policy
    const { data: policyData, error: policyError } = await supabaseAdmin
      .from('origami_policies')
      .select('*')
      .eq('policy_id', policyId)
      .single()

    if (policyError) throw policyError

    // Step 2: Fetch claims, location_values (SOV), locations, coverages, carriers, named insureds
    const [claims, locationValues, clientLocations, coverages, policyCarriers, namedInsureds] = await Promise.all([
      // Only fetch claims directly tied to this policy
      fetchAll(
        supabaseAdmin, 'origami_claims',
        'claim_id, claim_number, claimant, loss_date, report_date, status, loss_description, location_id, policy_id, tpa_claim_number, paid1, paid2, paid3, paid4, paid5, paid6, paid7, reserve1, reserve2, reserve3, reserve4, reserve5, reserve6, reserve7, recovery1, recovery2, recovery3, recovery4, recovery5, recovery6, recovery7, coverage_id',
        { policy_id: policyId },
        'loss_date'
      ),
      fetchAll(
        supabaseAdmin, 'origami_location_values',
        'location_value_id, location_id, policy_id, description, building_value, contents_value, bi_value, other_value, total_insured_value, premium, occupancy, year_built, number_of_stories, number_of_units, square_footage',
        { policy_id: policyId }
      ),
      // Fetch ALL origami_locations for this policy's client — the real source of truth
      policyData.client_id ? fetchAll(
        supabaseAdmin, 'origami_locations',
        'location_id, description, display_code, street1, city, state_id, postal_code, client_id, is_inactive',
        { client_id: policyData.client_id }
      ) : Promise.resolve([]),
      // Policy coverages
      fetchAll(
        supabaseAdmin, 'origami_policy_coverages',
        'policy_coverage_id, coverage_id, description, "limit", deductible, premium, sir, attachment_point, aggregate_limit, per_occurrence_limit, each_accident_limit, disease_each_employee_limit, disease_policy_limit, notes',
        { policy_id: policyId },
        'description',
        true
      ),
      // Policy carriers
      fetchAll(
        supabaseAdmin, 'origami_policy_carriers',
        'policy_carrier_id, carrier_id, policy_number, participation, "limit", premium, layer_number, commission, commission_amount, deductible, sir, aggregate_limit, per_occurrence_limit, attachment_point, notes',
        { policy_id: policyId }
      ),
      // Named insureds
      fetchAll(
        supabaseAdmin, 'origami_policy_named_insureds',
        'policy_named_insured_id, description',
        { policy_id: policyId }
      ),
    ])

    // Enrich carriers with carrier names
    let carrierIds = policyCarriers.map(pc => pc.carrier_id).filter(Boolean)
    let carrierLookup = {}
    if (carrierIds.length > 0) {
      const carriers = await fetchAll(
        supabaseAdmin, 'origami_carriers',
        'carrier_id, description, legal_name, display_code',
        { carrier_id_in: carrierIds }
      )
      carriers.forEach(c => { carrierLookup[c.carrier_id] = c })
    }

    const enrichedCarriers = policyCarriers.map(pc => ({
      ...pc,
      carrier_name: carrierLookup[pc.carrier_id]?.description || carrierLookup[pc.carrier_id]?.legal_name || null,
      carrier_code: carrierLookup[pc.carrier_id]?.display_code || null,
    }))

    // Fetch app location mappings for these locations
    const clientLocationIds = clientLocations.map(l => l.location_id)
    let locationMappings = []
    if (clientLocationIds.length > 0) {
      locationMappings = await fetchAll(
        supabaseAdmin, 'origami_location_map',
        'origami_location_id, app_location_id',
        { origami_location_id_in: clientLocationIds, organization_id: organizationId, entity_type: 'location' }
      )
    }

    const locationMapLookup = {}
    locationMappings.forEach(m => { locationMapLookup[m.origami_location_id] = m.app_location_id })

    const origamiLocationLookup = {}
    clientLocations.forEach(loc => { origamiLocationLookup[loc.location_id] = loc })

    // Build enriched locations:
    // If SOV data exists, use it. Otherwise use all client locations.
    let enrichedLocations
    if (locationValues.length > 0) {
      enrichedLocations = locationValues.map(lv => ({
        ...lv,
        origami_location: origamiLocationLookup[lv.location_id] || null,
        app_location_id: locationMapLookup[lv.location_id] || null,
      }))
    } else {
      // No SOV — use all client locations
      enrichedLocations = clientLocations.map(loc => ({
        location_value_id: `client-${policyId}-${loc.location_id}`,
        location_id: loc.location_id,
        policy_id: policyId,
        description: loc.description || loc.street1 || `Location ${loc.location_id}`,
        building_value: null,
        contents_value: null,
        bi_value: null,
        other_value: null,
        total_insured_value: null,
        premium: null,
        occupancy: null,
        year_built: null,
        origami_location: loc,
        app_location_id: locationMapLookup[loc.location_id] || null,
        _from_client: true,
      }))
    }

    // Calculate totals for claims
    const claimsWithTotals = claims.map(c => {
      const totalPaid = [c.paid1, c.paid2, c.paid3, c.paid4, c.paid5, c.paid6, c.paid7]
        .reduce((sum, v) => sum + (Number(v) || 0), 0)
      const totalReserved = [c.reserve1, c.reserve2, c.reserve3, c.reserve4, c.reserve5, c.reserve6, c.reserve7]
        .reduce((sum, v) => sum + (Number(v) || 0), 0)
      const totalRecovery = [c.recovery1, c.recovery2, c.recovery3, c.recovery4, c.recovery5, c.recovery6, c.recovery7]
        .reduce((sum, v) => sum + (Number(v) || 0), 0)
      return {
        ...c,
        total_paid: totalPaid,
        total_reserved: totalReserved,
        total_recovery: totalRecovery,
        total_incurred: totalPaid + totalReserved - totalRecovery,
      }
    })

    // Enrich claims with location names
    const claimsEnriched = claimsWithTotals.map(c => ({
      ...c,
      location_name: origamiLocationLookup[c.location_id]?.description || null,
      location_city: origamiLocationLookup[c.location_id]?.city || null,
      location_state: origamiLocationLookup[c.location_id]?.state_id != null ? String(origamiLocationLookup[c.location_id].state_id) : null,
    }))

    // Fetch notes for claims on this policy (parent_domain_id = 1 = claim notes)
    const claimIds = claims.map(c => c.claim_id).filter(Boolean)
    let notes = []
    if (claimIds.length > 0) {
      notes = await fetchAll(
        supabaseAdmin, 'origami_notes',
        'note_id, parent_id, body, author_name, entry_date, subject',
        { parent_domain_id: 1, parent_id_in: claimIds },
        'entry_date'
      )
    }

    const notesByClaimId = {}
    notes.forEach(n => {
      if (!notesByClaimId[n.parent_id]) notesByClaimId[n.parent_id] = []
      notesByClaimId[n.parent_id].push(n)
    })

    const claimsWithNotes = claimsEnriched.map(c => ({
      ...c,
      notes: notesByClaimId[c.claim_id] || [],
    }))

    console.log(`[Policy Data] Policy ${policyData.policy_number}: ${enrichedLocations.length} locations (${locationValues.length} SOV, ${clientLocations.length} client locations), ${claimsWithNotes.length} claims, ${notes.length} notes`)

    return NextResponse.json({
      policy: policyData,
      claims: claimsWithNotes,
      locations: enrichedLocations,
      coverages,
      carriers: enrichedCarriers,
      namedInsureds,
      hasSOV: locationValues.length > 0,
    })
  } catch (error) {
    console.error('Policy data error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
