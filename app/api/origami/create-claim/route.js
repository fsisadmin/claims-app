import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { client_id, claimant, loss_date, loss_description, location_id, status, claim_number } = body

    if (!client_id || !claimant) {
      return NextResponse.json({ error: 'Missing required fields (client_id, claimant)' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get next claim_id (max + 1)
    const { data: maxRow } = await supabaseAdmin
      .from('origami_claims')
      .select('claim_id')
      .order('claim_id', { ascending: false })
      .limit(1)
      .single()

    const nextClaimId = (maxRow?.claim_id || 50000) + 1

    // Generate claim number if not provided
    const claimNum = claim_number || `FS-${nextClaimId}`

    const newClaim = {
      claim_id: nextClaimId,
      client_id: Number(client_id),
      claimant,
      claim_number: claimNum,
      loss_date: loss_date || null,
      report_date: new Date().toISOString().split('T')[0],
      loss_description: loss_description || null,
      location_id: location_id ? Number(location_id) : null,
      status: status || 'O',
      entry_date: new Date().toISOString(),
      modified_date: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('origami_claims')
      .insert(newClaim)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ claim: data })
  } catch (error) {
    console.error('Create claim error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
