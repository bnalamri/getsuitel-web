import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { verificationEmailHtml, verificationEmailSubject } from '@/lib/email/verification-email'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { email, name, lang } = await req.json()
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getsuitel.com'
  const emailLang = lang === 'ar' ? 'ar' : 'en'

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    options: { redirectTo: `${siteUrl}/auth/login?verified=1` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json(
      { error: linkError?.message ?? 'Could not generate verification link' },
      { status: 500 }
    )
  }

  const html = verificationEmailHtml(name || email, linkData.properties.action_link, emailLang)
  const { error: emailError } = await resend.emails.send({
    from: 'GetSuitel <noreply@getsuitel.com>',
    to: [email],
    subject: verificationEmailSubject(emailLang),
    html,
  })

  if (emailError) return NextResponse.json({ error: String(emailError) }, { status: 500 })
  return NextResponse.json({ ok: true })
}
