import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://getsuitel.com'

function roleLabel(role: string) {
  return role === 'property_manager' ? 'Property Manager' : 'Financial Manager'
}
function roleLabelAr(role: string) {
  return role === 'property_manager' ? 'مدير العقارات' : 'المدير المالي'
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, organization_id, full_name').eq('id', user.id).single()

  if (!profile || profile.role !== 'owner' || !profile.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, role } = await req.json()
  if (!email || !role) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!['property_manager', 'financial_manager'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get org name
  const { data: org } = await admin
    .from('organizations').select('name').eq('id', profile.organization_id).single()

  // Create invitation (delete any existing pending invite for this email+org+role)
  await admin
    .from('staff_invitations')
    .delete()
    .eq('organization_id', profile.organization_id)
    .eq('email', email.toLowerCase())
    .eq('role', role)
    .is('accepted_at', null)

  const { data: invitation, error } = await admin
    .from('staff_invitations')
    .insert({
      organization_id: profile.organization_id,
      email: email.toLowerCase(),
      role,
      invited_by: user.id,
    })
    .select('token, expires_at')
    .single()

  if (error || !invitation) {
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }

  const registerLink = `${APP_URL}/auth/register?staff_token=${invitation.token}`
  const expiryDate = new Date(invitation.expires_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const label = roleLabel(role)
  const orgName = org?.name ?? 'your organization'
  const inviterName = profile.full_name ?? 'Your organization owner'

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">Staff Invitation</div>
</td></tr>
<tr><td style="padding:32px">
  <div style="font-size:15px;color:#334155;line-height:1.8">
    You've been invited by <strong>${inviterName}</strong> to join <strong>${orgName}</strong> as a <strong>${label}</strong> on GetSuitel.<br><br>
    Click the button below to create your account. This invitation expires on <strong>${expiryDate}</strong>.
  </div>
  <div style="margin-top:28px">
    <a href="${registerLink}" style="display:inline-block;background:#1B3A6B;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">
      Accept Invitation &amp; Create Account
    </a>
  </div>
  <div style="margin-top:20px;font-size:12px;color:#94a3b8">
    Or copy this link:<br>
    <span style="color:#1B3A6B;word-break:break-all">${registerLink}</span>
  </div>
  <div style="margin-top:24px;font-size:12px;color:#64748b">
    If you didn't expect this invitation, you can safely ignore this email.
  </div>
</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</td></tr>
</table></td></tr></table></body></html>`

  try {
    await resend.emails.send({
      from: 'GetSuitel <noreply@getsuitel.com>',
      to: [email],
      subject: `You're invited to join ${orgName} on GetSuitel as ${label}`,
      html,
    })
  } catch (e) {
    console.error('Invitation email failed:', e)
    // Don't fail the request — invitation was created, email is secondary
  }

  return NextResponse.json({ ok: true })
}
