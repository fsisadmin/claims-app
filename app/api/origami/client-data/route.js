import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function fetchAll(supabase, table, select, filters = {}, orderBy = null) {
  const PAGE_SIZE = 1000
  let allRows = []
  let from = 0
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1)
    if (orderBy) query = query.order(orderBy, { ascending: false })
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
    const { appClientId, organizationId } = await request.json()
    if (!appClientId || !organizationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Step 1: Find origami client IDs mapped to this app client
    const { data: clientMaps, error: mapError } = await supabaseAdmin
      .from('origami_client_map')
      .select('origami_client_id')
      .eq('app_client_id', appClientId)
      .eq('organization_id', organizationId)
      .eq('entity_type', 'client')

    if (mapError) throw mapError

    const origamiClientIds = (clientMaps || []).map(m => m.origami_client_id)

    if (origamiClientIds.length === 0) {
      return NextResponse.json({ claims: [], policies: [], hasOrigamiData: false })
    }

    // Step 2: Fetch origami claims and policies in parallel
    const [claims, rawPolicies] = await Promise.all([
      fetchAll(
        supabaseAdmin, 'origami_claims',
        'claim_id, claim_number, claimant, loss_date, report_date, status, loss_description, location_id, policy_id, tpa_claim_number, carrier_policy_number, paid1, paid2, paid3, paid4, paid5, paid6, paid7, reserve1, reserve2, reserve3, reserve4, reserve5, reserve6, reserve7, recovery1, recovery2, recovery3, recovery4, recovery5, recovery6, recovery7, client_id, coverage_id',
        { client_id_in: origamiClientIds },
        'loss_date'
      ),
      fetchAll(
        supabaseAdmin, 'origami_policies',
        'policy_id, policy_number, description, effective_date, expiration_date, premium, status, client_id, major_coverage_id',
        { client_id_in: origamiClientIds },
        'expiration_date'
      ),
    ])

    // Step 3: Fetch ALL origami_locations for these clients (the real source of truth)
    const origamiLocations = await fetchAll(
      supabaseAdmin, 'origami_locations',
      'location_id, description, display_code, street1, city, state_id, postal_code, client_id, is_inactive',
      { client_id_in: origamiClientIds }
    )

    // Also fetch location_values (SOV data) if available
    const policyIds = rawPolicies.map(p => p.policy_id).filter(Boolean)
    let locationValues = []
    if (policyIds.length > 0) {
      locationValues = await fetchAll(
        supabaseAdmin, 'origami_location_values',
        'location_value_id, location_id, policy_id, description, building_value, contents_value, bi_value, other_value, total_insured_value, premium, occupancy, year_built, number_of_stories, number_of_units, square_footage',
        { policy_id_in: policyIds }
      )
    }

    const origamiLocationLookup = {}
    origamiLocations.forEach(loc => { origamiLocationLookup[loc.location_id] = loc })

    // Build SOV lookup: policy_id -> location_ids
    const sovByPolicy = {}
    locationValues.forEach(lv => {
      if (!sovByPolicy[lv.policy_id]) sovByPolicy[lv.policy_id] = []
      sovByPolicy[lv.policy_id].push(lv)
    })

    console.log(`[Client Data] ${rawPolicies.length} policies, ${origamiLocations.length} origami_locations for client, ${locationValues.length} location_values (SOV)`)

    // Attach locations to each policy:
    // - Use SOV data if available for that policy
    // - Otherwise, attach all client locations that share the same client_id as the policy
    const policies = rawPolicies.map(p => {
      const sovLocations = sovByPolicy[p.policy_id] || []

      if (sovLocations.length > 0) {
        // SOV data exists — use it
        return { ...p, location_values: sovLocations }
      }

      // No SOV — attach all origami_locations for this policy's client_id
      const clientLocations = origamiLocations
        .filter(loc => loc.client_id === p.client_id)
        .map(loc => ({
          location_value_id: `client-${p.policy_id}-${loc.location_id}`,
          location_id: loc.location_id,
          policy_id: p.policy_id,
          description: loc.description || loc.street1 || `Location ${loc.location_id}`,
          building_value: null,
          contents_value: null,
          bi_value: null,
          other_value: null,
          total_insured_value: null,
          premium: null,
          occupancy: null,
          year_built: null,
          _from_client: true,
        }))

      return { ...p, location_values: clientLocations }
    })

    // Calculate totals for claims
    const claimsWithTotals = claims.map(c => {
      const totalPaid = [c.paid1, c.paid2, c.paid3, c.paid4, c.paid5, c.paid6, c.paid7]
        .reduce((sum, v) => sum + (Number(v) || 0), 0)
      const totalReserved = [c.reserve1, c.reserve2, c.reserve3, c.reserve4, c.reserve5, c.reserve6, c.reserve7]
        .reduce((sum, v) => sum + (Number(v) || 0), 0)
      const totalRecovery = [c.recovery1, c.recovery2, c.recovery3, c.recovery4, c.recovery5, c.recovery6, c.recovery7]
        .reduce((sum, v) => sum + (Number(v) || 0), 0)
      const totalIncurred = totalPaid + totalReserved - totalRecovery
      return {
        ...c,
        total_paid: totalPaid,
        total_reserved: totalReserved,
        total_recovery: totalRecovery,
        total_incurred: totalIncurred,
      }
    })

    // Enrich claims with location names
    const claimsEnriched = claimsWithTotals.map(c => ({
      ...c,
      location_name: origamiLocationLookup[c.location_id]?.description || null,
      location_city: origamiLocationLookup[c.location_id]?.city || null,
      location_state: origamiLocationLookup[c.location_id]?.state_id != null ? String(origamiLocationLookup[c.location_id].state_id) : null,
    }))

    // Fetch notes for all claims (parent_domain_id = 1 means claim notes)
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

    // Group notes by claim_id
    const notesByClaimId = {}
    notes.forEach(n => {
      if (!notesByClaimId[n.parent_id]) notesByClaimId[n.parent_id] = []
      notesByClaimId[n.parent_id].push(n)
    })

    // Attach notes to claims
    const claimsWithNotes = claimsEnriched.map(c => ({
      ...c,
      notes: notesByClaimId[c.claim_id] || [],
    }))

    console.log(`[Client Data] ${notes.length} notes for ${claimIds.length} claims`)

    return NextResponse.json({
      claims: claimsWithNotes,
      policies,
      hasOrigamiData: true,
    })
  } catch (error) {
    console.error('Client data error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
