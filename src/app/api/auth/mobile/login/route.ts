// @ts-nocheck
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkPassword, findTrustedDevice, issueLoginCode } from '@/lib/trustedDevices'

/**
 * Mobile step 1. Body: { email, password, device_token?, lang? }
 * - Trusted phone  -> { session: { access_token, refresh_token } }
 * - New phone      -> emails a code, returns { needs_code: true }
 */
export async function POST(req: Request) {
  const { email, password, device_token, lang } = await req.json().catch(() => ({}))
  if (!email || !password) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })

  const check = await checkPassword(String(email).trim(), String(password))
  if (check.error) return NextResponse.json({ error: check.error }, { status: 401 })

  if (await findTrustedDevice(check.user.id, device_token)) {
    return NextResponse.json({
      session: { access_token: check.session.access_token, refresh_token: check.session.refresh_token },
    })
  }

  const admin = createAdminClient()
  const { data: p } = await admin.from('profiles').select('full_name').eq('id', check.user.id).maybeSingle()
  const err = await issueLoginCode(check.user.id, check.user.email!, p?.full_name ?? '', lang === 'ar' ? 'ar' : 'en')
  if (err) return NextResponse.json({ error: err }, { status: 429 })
  return NextResponse.json({ needs_code: true })
}
