import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { incidentId, claimNumber, coverageId } = await request.json()
    if (!incidentId) {
      return NextResponse.json({ error: 'Missing incidentId' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch the incident
    const { data: incident, error: incidentError } = await supabaseAdmin
      .from('origami_incidents')
      .select('*')
      .eq('incident_id', incidentId)
      .single()

    if (incidentError) throw incidentError

    // Check if a claim already exists for this incident
    const { data: existingClaims } = await supabaseAdmin
      .from('origami_claims')
      .select('claim_id, claim_number')
      .eq('incident_id', incidentId)

    if (existingClaims && existingClaims.length > 0) {
      return NextResponse.json({
        error: `A claim already exists for this incident: ${existingClaims[0].claim_number}`,
      }, { status: 400 })
    }

    // Generate a new claim_id (find max and add 1)
    const { data: maxClaim } = await supabaseAdmin
      .from('origami_claims')
      .select('claim_id')
      .order('claim_id', { ascending: false })
      .limit(1)

    const newClaimId = (maxClaim?.[0]?.claim_id || 50000) + 1

    // Generate claim number if not provided
    const finalClaimNumber = claimNumber || `INC-${incident.incident_number || incidentId}`

    // Create the claim from incident data
    const newClaim = {
      claim_id: newClaimId,
      client_id: incident.client_id,
      claim_number: finalClaimNumber,
      incident_id: incidentId,
      claimant: incident.claimant,
      loss_date: incident.loss_date,
      loss_time: incident.loss_time,
      report_date: incident.report_date,
      employer_report_date: incident.employer_report_date,
      location_id: incident.location_id,
      accident_state_id: incident.accident_state_id,
      loss_description: incident.loss_description,
      event_description: incident.event_description,
      major_injury: incident.major_injury,
      cause_id: incident.cause_id,
      body_part_id: incident.body_part_id,
      nature_id: incident.nature_id,
      osha_recordable: incident.osha_recordable,
      social_security: incident.social_security,
      claimant_address1: incident.claimant_address1,
      claimant_address2: incident.claimant_address2,
      claimant_city: incident.claimant_city,
      claimant_state_id: incident.claimant_state_id,
      claimant_postal_code: incident.claimant_postal_code,
      claimant_country_id: incident.claimant_country_id,
      claimant_home_phone: incident.claimant_home_phone,
      claimant_work_phone: incident.claimant_work_phone,
      claimant_age: incident.claimant_age,
      birth_date: incident.birth_date,
      gender: incident.gender,
      marital_status: incident.marital_status,
      hire_date: incident.hire_date,
      occupation: incident.occupation,
      department_name: incident.department_name,
      supervisor: incident.supervisor,
      employment_status: incident.employment_status,
      average_weekly_wage: incident.average_weekly_wage,
      accident_street1: incident.accident_street1,
      accident_city: incident.accident_city,
      accident_postal_code: incident.accident_postal_code,
      coverage_id: coverageId || null,
      status: 'O', // Open
      entry_date: new Date().toISOString(),
      // Financials start at zero
      paid1: 0, paid2: 0, paid3: 0, paid4: 0, paid5: 0, paid6: 0, paid7: 0,
      reserve1: 0, reserve2: 0, reserve3: 0, reserve4: 0, reserve5: 0, reserve6: 0, reserve7: 0,
      recovery1: 0, recovery2: 0, recovery3: 0, recovery4: 0, recovery5: 0, recovery6: 0, recovery7: 0,
    }

    const { error: insertError } = await supabaseAdmin
      .from('origami_claims')
      .insert(newClaim)

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      claimId: newClaimId,
      claimNumber: finalClaimNumber,
    })
  } catch (error) {
    console.error('Convert to claim error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
