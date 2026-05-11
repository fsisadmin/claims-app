import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { token, password, fullName } = await request.json()
    if (!token || !password) {
      return NextResponse.json({ error: 'token and password are required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Look up + validate the invitation
    const { data: invitation, error: invErr } = await supabaseAdmin
      .from('user_invitations')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (invErr) throw invErr
    if (!invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 })
    }

    // Create the auth user with email already confirmed so Supabase does not
    // send its default "Confirm your signup" email — the invite click already
    // proved the email belongs to the recipient.
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || '' },
    })
    if (createErr) throw createErr

    // Backfill the profile row with org + role + name
    const { error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .update({
        organization_id: invitation.organization_id,
        role: invitation.role,
        full_name: fullName || null,
        email: invitation.email,
      })
      .eq('id', created.user.id)
    if (profileErr) {
      // Profile row may not have been auto-created by a trigger — fall back to insert
      await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: created.user.id,
          organization_id: invitation.organization_id,
          role: invitation.role,
          full_name: fullName || null,
          email: invitation.email,
        })
    }

    // Mark the invitation as used
    await supabaseAdmin
      .from('user_invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return NextResponse.json({ success: true, email: invitation.email })
  } catch (error) {
    console.error('Accept invitation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
