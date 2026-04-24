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
    const { appLocationId, organizationId } = await request.json()
    if (!appLocationId || !organizationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Step 1: Find origami location IDs mapped to this app location
    const { data: locationMaps, error: mapError } = await supabaseAdmin
      .from('origami_location_map')
      .select('origami_location_id')
      .eq('app_location_id', appLocationId)
      .eq('organization_id', organizationId)
      .eq('entity_type', 'location')

    if (mapError) throw mapError

    const origamiLocationIds = (locationMaps || []).map(m => m.origami_location_id)

    if (origamiLocationIds.length === 0) {
      return NextResponse.json({ claims: [], policies: [], incidents: [], hasOrigamiData: false })
    }

    // Step 2: Fetch origami claims, policies (via location_values), and incidents in parallel
    const [claims, locationValues, incidents] = await Promise.all([
      fetchAll(
        supabaseAdmin, 'origami_claims',
        'claim_id, claim_number, claimant, loss_date, report_date, status, loss_description, location_id, policy_id, tpa_claim_number, paid1, paid2, paid3, paid4, paid5, paid6, paid7, reserve1, reserve2, reserve3, reserve4, reserve5, reserve6, reserve7, recovery1, recovery2, recovery3, recovery4, recovery5, recovery6, recovery7, coverage_id',
        { location_id_in: origamiLocationIds },
        'loss_date'
      ),
      fetchAll(
        supabaseAdmin, 'origami_location_values',
        'location_value_id, location_id, policy_id, description, building_value, contents_value, bi_value, other_value, total_insured_value, premium, occupancy, year_built, number_of_stories, number_of_units, square_footage',
        { location_id_in: origamiLocationIds }
      ),
      fetchAll(
        supabaseAdmin, 'origami_incidents',
        'incident_id, incident_number, claimant, loss_date, report_date, status, loss_description, location_id, incident_type_id, major_injury, osha_recordable',
        { location_id_in: origamiLocationIds },
        'loss_date'
      ),
    ])

    // Get unique policy IDs from location_values to fetch policy details
    const policyIds = [...new Set(locationValues.map(lv => lv.policy_id).filter(Boolean))]
    let policies = []
    if (policyIds.length > 0) {
      policies = await fetchAll(
        supabaseAdmin, 'origami_policies',
        'policy_id, policy_number, description, effective_date, expiration_date, premium, status, major_coverage_id',
        { policy_id_in: policyIds },
        'expiration_date'
      )
      // Attach location values to each policy
      policies = policies.map(p => ({
        ...p,
        location_values: locationValues.filter(lv => lv.policy_id === p.policy_id),
      }))
    } else {
      // Fallback: no SOV data for this location — show all client-level policies
      // Get client_id from the origami location
      const { data: origLocation } = await supabaseAdmin
        .from('origami_locations')
        .select('client_id')
        .in('location_id', origamiLocationIds)
        .limit(1)
        .single()

      if (origLocation?.client_id) {
        policies = await fetchAll(
          supabaseAdmin, 'origami_policies',
          'policy_id, policy_number, description, effective_date, expiration_date, premium, status, major_coverage_id',
          { client_id: origLocation.client_id },
          'expiration_date'
        )
        // Fetch location counts per policy
        if (policies.length > 0) {
          const allPolicyIds = policies.map(p => p.policy_id)
          const allLV = await fetchAll(
            supabaseAdmin, 'origami_location_values',
            'policy_id, location_id',
            { policy_id_in: allPolicyIds }
          )
          policies = policies.map(p => ({
            ...p,
            location_values: allLV.filter(lv => lv.policy_id === p.policy_id),
          }))
        }
      }
    }

    // Fetch policies linked to claims (for coverage type)
    const claimPolicyIds = [...new Set(claims.map(c => c.policy_id).filter(Boolean))]
    let claimPolicies = []
    if (claimPolicyIds.length > 0) {
      claimPolicies = await fetchAll(supabaseAdmin, 'origami_policies', 'policy_id, description, major_coverage_id', { policy_id_in: claimPolicyIds })
    }
    const claimPolicyLookup = {}
    claimPolicies.forEach(p => { claimPolicyLookup[p.policy_id] = p })

    const COVERAGE_MAP = { 20: 'APD', 40: 'GL', 50: 'Property', 60: 'WC' }
    function getCoverageType(policy) {
      if (!policy) return null
      if (policy.major_coverage_id && COVERAGE_MAP[policy.major_coverage_id]) return COVERAGE_MAP[policy.major_coverage_id]
      return null
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
        coverage_type: getCoverageType(claimPolicyLookup[c.policy_id]) || null,
      }
    })

    return NextResponse.json({
      claims: claimsWithTotals,
      policies,
      incidents,
      origamiLocationIds,
      hasOrigamiData: true,
    })
  } catch (error) {
    console.error('Location data error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
