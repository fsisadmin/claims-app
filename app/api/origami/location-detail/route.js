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
    const { origamiLocationId, organizationId } = await request.json()
    if (!origamiLocationId || !organizationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch location + FSIS 360 mapping in parallel
    const [{ data: location, error: locError }, { data: locMap }] = await Promise.all([
      supabaseAdmin
        .from('origami_locations')
        .select('*')
        .eq('location_id', origamiLocationId)
        .single(),
      supabaseAdmin
        .from('origami_location_map')
        .select('app_location_id')
        .eq('origami_location_id', origamiLocationId)
        .eq('entity_type', 'location')
        .maybeSingle()
        .then(r => ({ data: r.data })),
    ])

    if (locError) throw locError

    // If mapped, look up the app client id for a direct link to FSIS 360
    let appClientId = null
    if (locMap?.app_location_id) {
      const { data: appLoc } = await supabaseAdmin
        .from('locations')
        .select('client_id')
        .eq('id', locMap.app_location_id)
        .maybeSingle()
      appClientId = appLoc?.client_id || null
    }

    // Fetch claims, location values, and incidents for this location
    const [claims, locationValues] = await Promise.all([
      fetchAll(
        supabaseAdmin, 'origami_claims',
        'claim_id, claim_number, claimant, loss_date, report_date, status, loss_description, location_id, policy_id, tpa_claim_number, paid1, paid2, paid3, paid4, paid5, paid6, paid7, reserve1, reserve2, reserve3, reserve4, reserve5, reserve6, reserve7, recovery1, recovery2, recovery3, recovery4, recovery5, recovery6, recovery7, coverage_id',
        { location_id: origamiLocationId },
        'loss_date'
      ),
      fetchAll(
        supabaseAdmin, 'origami_location_values',
        'location_value_id, location_id, policy_id, description, building_value, contents_value, bi_value, other_value, total_insured_value, premium, occupancy, year_built, number_of_stories, number_of_units, square_footage',
        { location_id: origamiLocationId }
      ),
    ])

    // Get policies — from location_values if SOV exists, otherwise from client
    const policyIds = [...new Set(locationValues.map(lv => lv.policy_id).filter(Boolean))]
    let policies = []
    if (policyIds.length > 0) {
      policies = await fetchAll(
        supabaseAdmin, 'origami_policies',
        'policy_id, policy_number, description, effective_date, expiration_date, premium, status, major_coverage_id',
        { policy_id_in: policyIds },
        'expiration_date'
      )
      policies = policies.map(p => ({
        ...p,
        location_values: locationValues.filter(lv => lv.policy_id === p.policy_id),
      }))
    } else if (location.client_id) {
      policies = await fetchAll(
        supabaseAdmin, 'origami_policies',
        'policy_id, policy_number, description, effective_date, expiration_date, premium, status, major_coverage_id',
        { client_id: location.client_id },
        'expiration_date'
      )
    }

    // Enrich location values with policy numbers
    const policyLookup = {}
    policies.forEach(p => { policyLookup[p.policy_id] = p })
    const enrichedLV = locationValues.map(lv => ({
      ...lv,
      policy_number: policyLookup[lv.policy_id]?.policy_number || null,
    }))

    // Map coverage ids → human labels (Property / GL / WC / APD)
    const COVERAGE_MAP = { 20: 'APD', 40: 'GL', 50: 'Property', 60: 'WC' }
    const policyById = {}
    policies.forEach(p => { policyById[p.policy_id] = p })

    const getCoverageType = (c) => {
      if (c.coverage_id && COVERAGE_MAP[c.coverage_id]) return COVERAGE_MAP[c.coverage_id]
      const p = policyById[c.policy_id]
      if (p?.major_coverage_id && COVERAGE_MAP[p.major_coverage_id]) return COVERAGE_MAP[p.major_coverage_id]
      return null
    }

    const locationName = location?.description || location?.street1 || null

    // Calculate totals for claims
    const claimsWithTotals = claims.map(c => {
      const totalPaid = [c.paid1, c.paid2, c.paid3, c.paid4, c.paid5, c.paid6, c.paid7].reduce((s, v) => s + (Number(v) || 0), 0)
      const totalReserved = [c.reserve1, c.reserve2, c.reserve3, c.reserve4, c.reserve5, c.reserve6, c.reserve7].reduce((s, v) => s + (Number(v) || 0), 0)
      const totalRecovery = [c.recovery1, c.recovery2, c.recovery3, c.recovery4, c.recovery5, c.recovery6, c.recovery7].reduce((s, v) => s + (Number(v) || 0), 0)
      return {
        ...c,
        total_paid: totalPaid,
        total_reserved: totalReserved,
        total_recovery: totalRecovery,
        total_incurred: totalPaid + totalReserved - totalRecovery,
        location_name: locationName,
        coverage_type: getCoverageType(c),
      }
    })

    return NextResponse.json({
      location,
      claims: claimsWithTotals,
      policies,
      locationValues: enrichedLV,
      appLocationId: locMap?.app_location_id || null,
      appClientId,
      isSynced: !!locMap?.app_location_id,
    })
  } catch (error) {
    console.error('Location detail error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
