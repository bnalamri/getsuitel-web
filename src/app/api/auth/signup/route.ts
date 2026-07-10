import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { verificationEmailHtml, verificationEmailSubject } from '@/lib/email/verification-email'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { email, password, name, role, lang, organization_id, plan, org_name, phone, staff_token } = await req.json()

  // If staff_token provided, mark invitation as accepted
  if (staff_token) {
    const admin = createAdminClient()
    const { data: inv } = await admin
      .from('staff_invitations')
      .select('id, role, organization_id, expires_at, accepted_at')
      .eq('token', staff_token)
      .single()
    if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 })
    }
    // Mark as accepted after user is created (done below)
  }

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create user without triggering Supabase's default verification email
  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      full_name: name,
      role,
      lang_pref: lang ?? 'en',
      organization_id: organization_id ?? null,
      plan: role === 'owner' ? plan : null,
      org_name: role === 'owner' ? org_name : null,
      phone: phone ?? null,
    },
  })

  if (createError) {
    const msg = createError.message ?? ''
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists') || msg.toLowerCase().includes('registered')) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: msg || 'Registration failed. Please try again.' }, { status: 500 })
  }

  const userId = userData.user.id
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getsuitel.com'
  const emailLang = lang === 'ar' ? 'ar' : 'en'

  // Generate branded verification link
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    options: { redirectTo: `${siteUrl}/auth/login?verified=1` },
  })

  if (!linkError && linkData?.properties?.action_link) {
    const html = verificationEmailHtml(name, linkData.properties.action_link, emailLang)
    await resend.emails.send({
      from: 'GetSuitel <noreply@getsuitel.com>',
      to: [email],
      subject: verificationEmailSubject(emailLang),
      html,
    }).catch(() => {}) // don't block registration if email fails
  }

  // For staff roles: the DB trigger doesn't handle property_manager/financial_manager,
  // so explicitly set organization_id on the profile after a brief delay for trigger to run.
  if (['property_manager', 'financial_manager'].includes(role) && organization_id) {
    await new Promise(r => setTimeout(r, 600))
    await admin.from('profiles').update({ organization_id }).eq('id', userId)
  }

  // Mark staff invitation as accepted
  if (staff_token) {
    await admin
      .from('staff_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('token', staff_token)
  }

  return NextResponse.json({ ok: true, userId })
}
