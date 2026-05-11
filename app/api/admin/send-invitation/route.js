import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

const FROM_ADDRESS = 'FSIS Claims <no-reply@franklinst.com>'
const REPLY_TO = null // set to an address if you want replies routed somewhere

function inviteEmailHtml({ inviteUrl, organizationName, inviterName, role }) {
  const expiresInDays = 7
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#f6f7f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#006B7D 0%,#008BA3 100%);padding:24px 32px;color:#fff;">
            <div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">FSIS Claims</div>
            <div style="font-size:22px;font-weight:600;margin-top:4px;">You've been invited</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;color:#111827;font-size:15px;line-height:1.6;">
            <p style="margin:0 0 14px 0;">Hi,</p>
            <p style="margin:0 0 14px 0;">
              ${inviterName ? `<strong>${inviterName}</strong> has invited you` : 'You have been invited'}
              to join <strong>${organizationName || 'FSIS Claims'}</strong>
              ${role ? ` as a <strong>${role}</strong>` : ''}.
            </p>
            <p style="margin:0 0 24px 0;">Click the button below to accept the invitation and create your account.</p>
            <p style="margin:0 0 24px 0;text-align:center;">
              <a href="${inviteUrl}" style="display:inline-block;background:#006B7D;color:#fff;text-decoration:none;font-weight:600;padding:12px 28px;border-radius:10px;font-size:15px;">Accept Invitation</a>
            </p>
            <p style="margin:0 0 8px 0;color:#6b7280;font-size:13px;">Or copy and paste this URL into your browser:</p>
            <p style="margin:0 0 24px 0;word-break:break-all;color:#006B7D;font-size:13px;"><a href="${inviteUrl}" style="color:#006B7D;">${inviteUrl}</a></p>
            <p style="margin:0;color:#6b7280;font-size:13px;">This invitation expires in ${expiresInDays} days. If you weren't expecting this, you can ignore the email.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
            Franklin Street Insurance Services
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(request) {
  try {
    const body = await request.json()
    const role = body.role || 'user'
    const organizationId = body.organizationId
    const invitedBy = body.invitedBy
    const inviterName = body.inviterName
    // Normalize email so case differences don't fight the UNIQUE(email) constraint
    const email = (body.email || '').trim().toLowerCase()

    if (!email || !organizationId || !invitedBy) {
      return NextResponse.json({ error: 'email, organizationId, and invitedBy are required' }, { status: 400 })
    }
    if (!process.env.RESEND_API) {
      return NextResponse.json({ error: 'RESEND_API not configured' }, { status: 500 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Generate a URL-safe random token (no DB extension dependency)
    const token = randomBytes(32).toString('base64url')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Clear out any prior unused invitation for the same email so re-invites
    // don't collide with the UNIQUE(email) constraint. Case-insensitive match
    // to clean up rows from older code that didn't normalize email.
    await supabaseAdmin
      .from('user_invitations')
      .delete()
      .ilike('email', email)
      .is('used_at', null)

    const { data: invitation, error: insertErr } = await supabaseAdmin
      .from('user_invitations')
      .insert({
        email,
        organization_id: organizationId,
        role,
        invited_by: invitedBy,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select('*, organizations(name)')
      .single()
    if (insertErr) throw insertErr

    const origin = request.headers.get('origin') || `https://${request.headers.get('host')}`
    const inviteUrl = `${origin}/signup?token=${token}`

    const html = inviteEmailHtml({
      inviteUrl,
      organizationName: invitation.organizations?.name,
      inviterName,
      role,
    })

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [email],
        subject: `You're invited to ${invitation.organizations?.name || 'FSIS Claims'}`,
        html,
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      }),
    })

    if (!resendRes.ok) {
      const errBody = await resendRes.json().catch(() => ({}))
      // Roll back the invitation row so the admin can retry without duplicate-email conflicts
      await supabaseAdmin.from('user_invitations').delete().eq('id', invitation.id)
      return NextResponse.json({
        error: `Resend failed: ${errBody.message || resendRes.statusText}`,
        details: errBody,
      }, { status: 502 })
    }

    return NextResponse.json({ invitation, inviteUrl })
  } catch (error) {
    console.error('Send invitation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
