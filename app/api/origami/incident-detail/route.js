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
        query = query.in(key.replace('_in', ''), val)
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
    const { incidentId } = await request.json()
    if (!incidentId) {
      return NextResponse.json({ error: 'Missing incidentId' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch incident
    const { data: incident, error: incidentError } = await supabaseAdmin
      .from('origami_incidents')
      .select('*')
      .eq('incident_id', incidentId)
      .single()

    if (incidentError) throw incidentError

    // Fetch location, location map, notes, and linked claims in parallel
    const [location, locationMap, rawNotes, linkedClaims] = await Promise.all([
      incident.location_id ? supabaseAdmin
        .from('origami_locations')
        .select('location_id, description, display_code, street1, street2, city, state_id, postal_code, county')
        .eq('location_id', incident.location_id)
        .single()
        .then(r => r.data) : Promise.resolve(null),
      // Look up the app location ID from the mapping table
      incident.location_id ? supabaseAdmin
        .from('origami_location_map')
        .select('app_location_id, organization_id')
        .eq('origami_location_id', incident.location_id)
        .eq('entity_type', 'location')
        .maybeSingle()
        .then(r => r.data) : Promise.resolve(null),
      // ParentDomainID=11 for incident notes
      fetchAll(
        supabaseAdmin, 'origami_notes',
        'note_id, parent_id, body, author_name, entry_date, subject, entry_user_id',
        { parent_domain_id: 11, parent_id: incidentId },
        'entry_date',
        false
      ),
      // Claims linked to this incident
      fetchAll(
        supabaseAdmin, 'origami_claims',
        'claim_id, claim_number, claimant, loss_date, status, paid1, paid2, paid3, paid4, paid5, paid6, paid7, reserve1, reserve2, reserve3, reserve4, reserve5, reserve6, reserve7, recovery1, recovery2, recovery3, recovery4, recovery5, recovery6, recovery7',
        { incident_id: incidentId }
      ),
    ])

    // Enrich notes with user info
    const noteUserIds = [...new Set(rawNotes.map(n => n.entry_user_id).filter(Boolean))]
    let userLookup = {}
    if (noteUserIds.length > 0) {
      const users = await fetchAll(
        supabaseAdmin, 'origami_users',
        'user_id, first_name, last_name, email, title',
        { user_id_in: noteUserIds }
      )
      users.forEach(u => { userLookup[u.user_id] = u })
    }

    const notes = rawNotes.map(n => {
      const user = userLookup[n.entry_user_id]
      return {
        ...n,
        user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : n.author_name,
        user_email: user?.email || null,
        user_title: user?.title || null,
      }
    })

    // Calculate totals for linked claims
    const claims = linkedClaims.map(c => {
      const totalPaid = [1,2,3,4,5,6,7].reduce((s, i) => s + (Number(c[`paid${i}`]) || 0), 0)
      const totalReserved = [1,2,3,4,5,6,7].reduce((s, i) => s + (Number(c[`reserve${i}`]) || 0), 0)
      const totalRecovery = [1,2,3,4,5,6,7].reduce((s, i) => s + (Number(c[`recovery${i}`]) || 0), 0)
      return {
        claim_id: c.claim_id,
        claim_number: c.claim_number,
        claimant: c.claimant,
        loss_date: c.loss_date,
        status: c.status,
        total_paid: totalPaid,
        total_reserved: totalReserved,
        total_incurred: totalPaid + totalReserved - totalRecovery,
      }
    })

    // Find the app client ID for this origami client
    let appClientId = null
    if (incident.client_id) {
      const { data: clientMap } = await supabaseAdmin
        .from('origami_client_map')
        .select('app_client_id')
        .eq('origami_client_id', incident.client_id)
        .eq('entity_type', 'client')
        .maybeSingle()
      appClientId = clientMap?.app_client_id || null
    }

    return NextResponse.json({
      incident,
      location: location ? {
        ...location,
        app_location_id: locationMap?.app_location_id || null,
        app_client_id: appClientId,
      } : null,
      notes,
      claims,
    })
  } catch (error) {
    console.error('Incident detail error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
