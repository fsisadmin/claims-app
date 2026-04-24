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
      } else if (key.endsWith('_cs')) {
        // Array contains - for searching integer arrays like claim_ids
        const col = key.replace('_cs', '')
        query = query.contains(col, [val])
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
    const { claimId } = await request.json()
    if (!claimId) {
      return NextResponse.json({ error: 'Missing claimId' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch claim
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('origami_claims')
      .select('*')
      .eq('claim_id', claimId)
      .single()

    if (claimError) throw claimError

    // Fetch notes, location, location map, and policy in parallel
    const [rawNotes, location, locationMap, policy] = await Promise.all([
      fetchAll(
        supabaseAdmin, 'origami_notes',
        'note_id, parent_id, body, author_name, entry_date, subject, entry_user_id',
        { parent_domain_id: 1, parent_id: claimId },
        'entry_date',
        false
      ),
      claim.location_id ? supabaseAdmin
        .from('origami_locations')
        .select('location_id, description, display_code, street1, city, state_id, postal_code')
        .eq('location_id', claim.location_id)
        .single()
        .then(r => r.data) : Promise.resolve(null),
      claim.location_id ? supabaseAdmin
        .from('origami_location_map')
        .select('app_location_id')
        .eq('origami_location_id', claim.location_id)
        .eq('entity_type', 'location')
        .maybeSingle()
        .then(r => r.data) : Promise.resolve(null),
      claim.policy_id ? supabaseAdmin
        .from('origami_policies')
        .select('policy_id, policy_number, description, effective_date, expiration_date')
        .eq('policy_id', claim.policy_id)
        .single()
        .then(r => r.data) : Promise.resolve(null),
    ])

    // Fetch files linked to this claim
    const files = await fetchAll(
      supabaseAdmin, 'origami_files',
      'file_id, file_name, mime_type, file_size, description, storage_path, note_id, entry_date, entry_user_id',
      { claim_ids_cs: claimId }
    )

    // Also fetch files linked via note_id (files attached to notes on this claim)
    const noteIds = rawNotes.map(n => n.note_id).filter(Boolean)
    let noteFiles = []
    if (noteIds.length > 0) {
      noteFiles = await fetchAll(
        supabaseAdmin, 'origami_files',
        'file_id, file_name, mime_type, file_size, description, storage_path, note_id, entry_date, entry_user_id',
        { note_id_in: noteIds }
      )
    }

    // Merge and dedupe files
    const allFileMap = {}
    for (const f of [...files, ...noteFiles]) {
      allFileMap[f.file_id] = f
    }
    const allFiles = Object.values(allFileMap)

    // Build note_id -> files lookup
    const noteFileMap = {}
    for (const f of allFiles) {
      if (f.note_id) {
        if (!noteFileMap[f.note_id]) noteFileMap[f.note_id] = []
        noteFileMap[f.note_id].push(f)
      }
    }

    // Files not attached to any note (standalone claim files)
    const standaloneFiles = allFiles.filter(f => !f.note_id)

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
        files: noteFileMap[n.note_id] || [],
      }
    })

    // Calculate totals
    const totalPaid = [claim.paid1, claim.paid2, claim.paid3, claim.paid4, claim.paid5, claim.paid6, claim.paid7]
      .reduce((sum, v) => sum + (Number(v) || 0), 0)
    const totalReserved = [claim.reserve1, claim.reserve2, claim.reserve3, claim.reserve4, claim.reserve5, claim.reserve6, claim.reserve7]
      .reduce((sum, v) => sum + (Number(v) || 0), 0)
    const totalRecovery = [claim.recovery1, claim.recovery2, claim.recovery3, claim.recovery4, claim.recovery5, claim.recovery6, claim.recovery7]
      .reduce((sum, v) => sum + (Number(v) || 0), 0)

    // Find the app client ID for this origami client
    let appClientId = null
    if (claim.client_id) {
      const { data: clientMap } = await supabaseAdmin
        .from('origami_client_map')
        .select('app_client_id')
        .eq('origami_client_id', claim.client_id)
        .eq('entity_type', 'client')
        .maybeSingle()
      appClientId = clientMap?.app_client_id || null
    }

    // Fetch all locations and policies for this client (for pickers)
    const [clientLocations, clientPolicies] = await Promise.all([
      claim.client_id ? fetchAll(
        supabaseAdmin, 'origami_locations',
        'location_id, description, display_code, street1, city, state_id',
        { client_id: claim.client_id }
      ) : Promise.resolve([]),
      claim.client_id ? fetchAll(
        supabaseAdmin, 'origami_policies',
        'policy_id, policy_number, description, effective_date, expiration_date',
        { client_id: claim.client_id }
      ) : Promise.resolve([]),
    ])

    return NextResponse.json({
      claim: {
        ...claim,
        total_paid: totalPaid,
        total_reserved: totalReserved,
        total_recovery: totalRecovery,
        total_incurred: totalPaid + totalReserved - totalRecovery,
      },
      notes,
      files: standaloneFiles,
      location: location ? {
        ...location,
        app_location_id: locationMap?.app_location_id || null,
        app_client_id: appClientId,
      } : null,
      policy,
      clientLocations,
      clientPolicies,
    })
  } catch (error) {
    console.error('Claim detail error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
