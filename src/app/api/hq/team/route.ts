import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://getsuitel.com'

// Supports both cookie auth (web) and Bearer token auth (mobile) — same
// dual-auth pattern as /api/hq/branches/[id]/status's resolveHQAdmin. The
// service-role client (admin) is only ever created and used inside this
// server route; it is never sent to any caller, web or mobile, so a mobile
// app hitting this endpoint over HTTPS is exactly as safe as the web app's
// own fetch calls to it — neither ships the key. Returns either the
// resolved HQ user (with role), or a { reason } explaining exactly why not.
async function resolveHQUser(
  req: NextRequest,
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ id: string; role: string } | { reason: string }> {
  const authHeader = req.headers.get('authorization')
  let userId: string | null = null

  try {
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user }, error } = await admin.auth.getUser(authHeader.slice(7))
      if (error) return { reason: `Bearer token rejected: ${error.message}` }
      userId = user?.id ?? null
      if (!userId) return { reason: 'Bearer token valid but no user attached' }
    } else {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
      if (!userId) return { reason: 'No Authorization header and no valid session cookie' }
    }
  } catch (e) {
    return { reason: `Token verification threw: ${e instanceof Error ? e.message : String(e)}` }
  }
  if (!userId) return { reason: 'No user resolved from token/session' }

  const { data: profile, error: profileErr } = await admin.from('profiles').select('role').eq('id', userId).single()
  if (profileErr) return { reason: `Profile lookup failed: ${profileErr.message}` }
  if (!['hq_admin', 'hq_staff', 'hq_finance'].includes(profile?.role ?? '')) {
    return { reason: `Role is '${profile?.role ?? 'none'}', an HQ role is required` }
  }
  return { id: userId, role: profile!.role as string }
}

// GET — list all HQ users + pending invitations
export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient()
    const resolved = await resolveHQUser(req, admin)
    if ('reason' in resolved) {
      return NextResponse.json({ error: `Unauthorized: ${resolved.reason}` }, { status: 401 })
    }

    const [{ data: users }, { data: invitations }] = await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, email, role, phone, created_at, avatar_url')
        .in('role', ['hq_admin', 'hq_staff', 'hq_finance'])
        .order('created_at'),
      admin
        .from('hq_invitations')
        .select('id, email, created_at, expires_at')
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
    ])

    return NextResponse.json({ users: users ?? [], invitations: invitations ?? [] })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected server error' }, { status: 500 })
  }
}

// POST — invite a new hq_staff member (hq_admin only)
export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient()
    const resolved = await resolveHQUser(req, admin)
    if ('reason' in resolved) {
      return NextResponse.json({ error: `Unauthorized: ${resolved.reason}` }, { status: 401 })
    }
    if (resolved.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden: hq_admin required to invite members' }, { status: 403 })
    }

    const { email, invited_role } = await req.json()
    if (!email?.trim()) return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    const roleToAssign = ['hq_staff', 'hq_finance'].includes(invited_role) ? invited_role : 'hq_staff'

    // Already an HQ user?
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .in('role', ['hq_admin', 'hq_staff', 'hq_finance'])
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'Already an HQ user' }, { status: 409 })

    // Delete any existing pending invite for this email
    await admin.from('hq_invitations').delete().eq('email', email.toLowerCase()).is('accepted_at', null)

    // Create invitation
    const { data: invitation, error } = await admin
      .from('hq_invitations')
      .insert({ email: email.toLowerCase(), invited_by: resolved.id, invited_role: roleToAssign })
      .select('token, expires_at')
      .single()

    if (error || !invitation) return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })

    const inviteUrl = `${APP_URL}/auth/hq-invite?token=${invitation.token}`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">HQ Team Invitation</div>
</td></tr>
<tr><td style="padding:32px">
  <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 24px">
    You've been invited to join the <strong>GetSuitel HQ team</strong> as an ${roleToAssign === 'hq_finance' ? 'HQ Finance' : 'HQ Staff'} member.
    Click the button below to set up your account.
  </p>
  <div style="text-align:center;margin:32px 0">
    <a href="${inviteUrl}" style="display:inline-block;background:#C9931A;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">Accept Invitation</a>
  </div>
  <p style="font-size:12px;color:#94a3b8;margin:0">This invitation expires in 7 days. If you didn't expect this, you can ignore it.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`

    await resend.emails.send({
      from: 'GetSuitel HQ <noreply@getsuitel.com>',
      to: [email],
      subject: 'You\'ve been invited to join GetSuitel HQ',
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected server error' }, { status: 500 })
  }
}

// PATCH — edit a member's name, phone, or role (hq_admin only)
export async function PATCH(req: NextRequest) {
  try {
    const admin = createAdminClient()
    const resolved = await resolveHQUser(req, admin)
    if ('reason' in resolved) {
      return NextResponse.json({ error: `Unauthorized: ${resolved.reason}` }, { status: 401 })
    }
    if (resolved.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden: hq_admin required to edit members' }, { status: 403 })
    }

    const { userId, full_name, phone, role } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    // Cannot change hq_admin's role
    const { data: target } = await admin.from('profiles').select('role').eq('id', userId).single()
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const updates: Record<string, string> = {}
    if (full_name !== undefined) updates.full_name = full_name.trim()
    if (phone !== undefined) updates.phone = phone.trim()
    if (role && target.role !== 'hq_admin') {
      if (!['hq_staff', 'hq_finance'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      updates.role = role
    }

    const { error } = await admin.from('profiles').update(updates).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected server error' }, { status: 500 })
  }
}

// DELETE — revoke hq_staff or cancel pending invitation (hq_admin only)
export async function DELETE(req: NextRequest) {
  try {
    const admin = createAdminClient()
    const resolved = await resolveHQUser(req, admin)
    if ('reason' in resolved) {
      return NextResponse.json({ error: `Unauthorized: ${resolved.reason}` }, { status: 401 })
    }
    if (resolved.role !== 'hq_admin') {
      return NextResponse.json({ error: 'Forbidden: hq_admin required to revoke members' }, { status: 403 })
    }

    const { userId, invitationId } = await req.json()

    if (invitationId) {
      await admin.from('hq_invitations').delete().eq('id', invitationId)
      return NextResponse.json({ ok: true })
    }

    if (userId) {
      if (userId === resolved.id) return NextResponse.json({ error: 'Cannot revoke yourself' }, { status: 400 })
      // Delete the auth user (cascades to profile via trigger)
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Missing userId or invitationId' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unexpected server error' }, { status: 500 })
  }
}
