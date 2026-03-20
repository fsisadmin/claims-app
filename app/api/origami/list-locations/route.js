import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function fetchAll(supabase, table, select, filters = {}, orderBy = null) {
  const PAGE_SIZE = 1000
  let allRows = []
  let from = 0
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1)
    if (orderBy) query = query.order(orderBy)
    for (const [key, val] of Object.entries(filters)) {
      if (key === 'client_id_in') {
        query = query.in('client_id', val)
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
    const { organizationId, appClientId } = await request.json()
    if (!organizationId || !appClientId) {
      return NextResponse.json({ error: 'Missing organizationId or appClientId' }, { status: 400 })
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
      return NextResponse.json({
        origamiLocations: [],
        appLocations: [],
        existingMappings: {},
        message: 'No origami clients mapped to this app client.',
      })
    }

    // Step 2: Fetch origami locations for those origami clients
    const origamiLocations = await fetchAll(
      supabaseAdmin, 'origami_locations',
      'location_id, client_id, display_code, description, street1, city, state_id, postal_code, is_inactive',
      { client_id_in: origamiClientIds }
    )

    // Step 3: Fetch app locations for this client
    const appLocations = await fetchAll(
      supabaseAdmin, 'locations',
      'id, location_name, street_address, city, state, zip, client_id',
      { client_id: appClientId },
      'location_name'
    )

    // Step 4: Fetch existing location mappings
    const existingMaps = await fetchAll(
      supabaseAdmin, 'origami_location_map',
      'origami_location_id, app_location_id',
      { organization_id: organizationId, entity_type: 'location' },
      'created_at'
    )

    const mappedOrigamiIds = new Set(existingMaps.map(m => m.origami_location_id))
    const unmappedOrigami = origamiLocations.filter(o => !mappedOrigamiIds.has(o.location_id))

    // Build reverse map: app_location_id → [origami_location_ids]
    const appToOrigamiMap = {}
    for (const m of existingMaps) {
      if (!appToOrigamiMap[m.app_location_id]) appToOrigamiMap[m.app_location_id] = []
      appToOrigamiMap[m.app_location_id].push(m.origami_location_id)
    }

    return NextResponse.json({
      origamiLocations: unmappedOrigami,
      allOrigamiLocations: origamiLocations,
      appLocations,
      existingMappings: appToOrigamiMap,
    })
  } catch (error) {
    console.error('List locations error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
