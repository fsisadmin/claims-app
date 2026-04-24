import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { claimId, confirmation } = await request.json()
    if (!claimId || !confirmation) {
      return NextResponse.json({ error: 'Missing claimId or confirmation' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch claim to verify confirmation matches
    const { data: claim, error: fetchErr } = await supabaseAdmin
      .from('origami_claims')
      .select('claim_id, claim_number')
      .eq('claim_id', claimId)
      .single()

    if (fetchErr || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    const expected = `delete ${claim.claim_number}`.toLowerCase().trim()
    if (confirmation.toLowerCase().trim() !== expected) {
      return NextResponse.json({ error: `Confirmation must be "delete ${claim.claim_number}"` }, { status: 400 })
    }

    // Delete related notes
    await supabaseAdmin
      .from('origami_notes')
      .delete()
      .eq('parent_domain_id', 1)
      .eq('parent_id', claimId)

    // Delete the claim
    const { error: delErr } = await supabaseAdmin
      .from('origami_claims')
      .delete()
      .eq('claim_id', claimId)

    if (delErr) throw delErr

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete claim error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
