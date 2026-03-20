import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Fetch all rows from a table, paginating past the 1000-row default limit
async function fetchAll(supabase, table, select, filters = {}, orderBy = 'name') {
  const PAGE_SIZE = 1000
  let allRows = []
  let from = 0
  while (true) {
    let query = supabase.from(table).select(select).order(orderBy).range(from, from + PAGE_SIZE - 1)
    for (const [key, val] of Object.entries(filters)) {
      query = query.eq(key, val)
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
    const { organizationId } = await request.json()
    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch ALL origami clients (paginated)
    const origamiClients = await fetchAll(
      supabaseAdmin, 'origami_clients',
      'client_id, name, street1, city, state, postal_code, primary_contact_name, primary_contact_email, reference_number'
    )

    // Fetch app clients
    const appClients = await fetchAll(
      supabaseAdmin, 'clients',
      'id, name, street_address, city, state, email, ams_code, client_number',
      { organization_id: organizationId }
    )

    // Fetch existing mappings
    const existingMaps = await fetchAll(
      supabaseAdmin, 'origami_client_map',
      'origami_client_id, app_client_id',
      { organization_id: organizationId, entity_type: 'client' },
      'created_at'
    )

    const mappedOrigamiIds = new Set(existingMaps.map(m => m.origami_client_id))
    const unmappedOrigami = origamiClients.filter(o => !mappedOrigamiIds.has(o.client_id))

    // Build reverse map: app_client_id → [origami_client_ids]
    const appToOrigamiMap = {}
    for (const m of existingMaps) {
      if (!appToOrigamiMap[m.app_client_id]) appToOrigamiMap[m.app_client_id] = []
      appToOrigamiMap[m.app_client_id].push(m.origami_client_id)
    }

    return NextResponse.json({
      origamiClients: unmappedOrigami,
      allOrigamiClients: origamiClients,
      appClients,
      existingMappings: appToOrigamiMap,
    })
  } catch (error) {
    console.error('List clients error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
