// @ts-nocheck
import { NextResponse } from 'next/server'
import { checkPassword, verifyLoginCode, createTrustedDevice } from '@/lib/trustedDevices'

/**
 * Mobile step 2. Body: { email, password, code, device_label? }
 * Valid code -> session + a new trusted-device token (kept in Android Keystore
 * by the app; trusted until the user removes it).
 */
export async function POST(req: Request) {
  const { email, password, code, device_label } = await req.json().catch(() => ({}))
  if (!email || !password || !code) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })

  const check = await checkPassword(String(email).trim(), String(password))
  if (check.error) return NextResponse.json({ error: check.error }, { status: 401 })

  if (!(await verifyLoginCode(check.user.id, String(code)))) {
    return NextResponse.json({ error: 'That code is incorrect or has expired.' }, { status: 401 })
  }

  const dev = await createTrustedDevice(check.user.id, 'phone', String(device_label || 'Android phone').slice(0, 60))
  return NextResponse.json({
    session: { access_token: check.session.access_token, refresh_token: check.session.refresh_token },
    device_token: dev.token,
    device_id: dev.id,
  })
}
