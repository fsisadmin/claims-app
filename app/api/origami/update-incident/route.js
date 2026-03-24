import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { incidentId, updates } = await request.json()
    if (!incidentId || !updates) {
      return NextResponse.json({ error: 'Missing incidentId or updates' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const allowedFields = [
      'status', 'claimant', 'loss_date', 'report_date', 'employer_report_date',
      'loss_description', 'event_description', 'activity_during_accident',
      'object_causing_injury', 'major_injury', 'osha_recordable', 'osha_case_number',
      'occupation', 'department_name', 'supervisor', 'employment_status',
      'average_weekly_wage', 'hire_date', 'last_worked_date',
      'date_of_first_treatment', 'hospital_name', 'physician_name', 'physician_phone',
      'accident_street1', 'accident_city', 'accident_state_id', 'accident_postal_code',
      'accident_county',
    ]

    const updateData = {}
    for (const [key, val] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateData[key] = val === '' ? null : val
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updateData.modified_date = new Date().toISOString()

    const { error } = await supabaseAdmin
      .from('origami_incidents')
      .update(updateData)
      .eq('incident_id', incidentId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update incident error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
