import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { client_id, claimant, loss_date, loss_description, event_description, location_id, status } = body

    if (!client_id || !claimant) {
      return NextResponse.json({ error: 'Missing required fields (client_id, claimant)' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get next incident_id (max + 1)
    const { data: maxRow } = await supabaseAdmin
      .from('origami_incidents')
      .select('incident_id')
      .order('incident_id', { ascending: false })
      .limit(1)
      .single()

    const nextIncidentId = (maxRow?.incident_id || 50000) + 1

    // Get next incident number for this client
    const { data: maxNum } = await supabaseAdmin
      .from('origami_incidents')
      .select('incident_number')
      .eq('client_id', Number(client_id))
      .order('incident_number', { ascending: false })
      .limit(1)
      .single()

    const nextNumber = maxNum ? String(Number(maxNum.incident_number || 0) + 1) : '1'

    const newIncident = {
      incident_id: nextIncidentId,
      client_id: Number(client_id),
      claimant,
      incident_number: nextNumber,
      loss_date: loss_date || null,
      report_date: new Date().toISOString().split('T')[0],
      loss_description: loss_description || null,
      event_description: event_description || null,
      location_id: location_id ? Number(location_id) : null,
      status: status || 'O',
      incident_type_id: 2,
      entry_date: new Date().toISOString(),
      modified_date: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('origami_incidents')
      .insert(newIncident)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ incident: data })
  } catch (error) {
    console.error('Create incident error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
