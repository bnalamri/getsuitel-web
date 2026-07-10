import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { verificationEmailHtml, verificationEmailSubject } from '@/lib/email/verification-email'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, email, name } = await req.json()
  if (!userId || !email) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getsuitel.com'

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    options: { redirectTo: `${siteUrl}/auth/login?verified=1` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: linkError?.message ?? 'Could not generate verification link' }, { status: 500 })
  }

  const html = verificationEmailHtml(name, linkData.properties.action_link)
  const { error: emailError } = await resend.emails.send({
    from: 'GetSuitel <noreply@getsuitel.com>',
    to: [email],
    subject: verificationEmailSubject(),
    html,
  })

  if (emailError) return NextResponse.json({ error: String(emailError) }, { status: 500 })
  return NextResponse.json({ ok: true })
}
