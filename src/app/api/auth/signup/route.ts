import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { verificationEmailHtml, verificationEmailSubject } from '@/lib/email/verification-email'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { email, password, name, role, lang, organization_id, plan, org_name, phone } = await req.json()

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

  return NextResponse.json({ ok: true, userId })
}
