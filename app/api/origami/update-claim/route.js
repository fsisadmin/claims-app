import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { claimId, updates } = await request.json()
    if (!claimId || !updates) {
      return NextResponse.json({ error: 'Missing claimId or updates' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const allowedFields = [
      // Financials
      'paid1', 'paid2', 'paid3', 'paid4', 'paid5', 'paid6', 'paid7',
      'reserve1', 'reserve2', 'reserve3', 'reserve4', 'reserve5', 'reserve6', 'reserve7',
      'recovery1', 'recovery2', 'recovery3', 'recovery4', 'recovery5', 'recovery6', 'recovery7',
      // Core fields
      'claim_number', 'tpa_claim_number', 'claimant', 'status',
      'loss_date', 'report_date', 'loss_description', 'event_description', 'event_location',
      'claim_adjuster_name', 'claim_adjuster_phone', 'occurrence_number',
      'carrier_policy_number', 'location_id', 'policy_id', 'coverage_id',
      // Lawsuit
      'lawsuit_filed', 'suit_date', 'lead_attorney', 'law_firm',
      'defense_counsel_attorney', 'defense_counsel_firm',
      'plaintiff_counsel_attorney', 'plaintiff_counsel_firm',
      'case_number', 'docket_number', 'case_overview', 'summary_of_facts',
      'expected_settlement_amount', 'actual_settlement_amount',
      // Claimant info
      'claimant_address1', 'claimant_city', 'claimant_state_id', 'claimant_postal_code',
      'claimant_home_phone', 'claimant_email', 'gender', 'birth_date',
    ]

    const numericFields = new Set([
      'paid1', 'paid2', 'paid3', 'paid4', 'paid5', 'paid6', 'paid7',
      'reserve1', 'reserve2', 'reserve3', 'reserve4', 'reserve5', 'reserve6', 'reserve7',
      'recovery1', 'recovery2', 'recovery3', 'recovery4', 'recovery5', 'recovery6', 'recovery7',
      'expected_settlement_amount', 'actual_settlement_amount',
      'location_id', 'policy_id', 'coverage_id', 'claimant_state_id',
    ])

    const boolFields = new Set(['lawsuit_filed'])

    const updateData = {}
    for (const [key, val] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue
      if (numericFields.has(key)) {
        updateData[key] = val === '' || val === null ? (key.startsWith('paid') || key.startsWith('reserve') || key.startsWith('recovery') ? 0 : null) : Number(val)
      } else if (boolFields.has(key)) {
        updateData[key] = val === true || val === 'true'
      } else {
        updateData[key] = val === '' ? null : val
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updateData.modified_date = new Date().toISOString()

    const { error } = await supabaseAdmin
      .from('origami_claims')
      .update(updateData)
      .eq('claim_id', claimId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update claim error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
