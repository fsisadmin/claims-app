import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { claimId, financials } = await request.json()
    if (!claimId || !financials) {
      return NextResponse.json({ error: 'Missing claimId or financials' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Only allow updating financial columns
    const allowedFields = [
      'paid1', 'paid2', 'paid3', 'paid4', 'paid5', 'paid6', 'paid7',
      'reserve1', 'reserve2', 'reserve3', 'reserve4', 'reserve5', 'reserve6', 'reserve7',
      'recovery1', 'recovery2', 'recovery3', 'recovery4', 'recovery5', 'recovery6', 'recovery7',
    ]

    const updateData = {}
    for (const [key, val] of Object.entries(financials)) {
      if (allowedFields.includes(key)) {
        updateData[key] = val === '' || val === null ? 0 : Number(val)
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

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
