// @ts-nocheck
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sha256, mintSession } from '@/lib/trustedDevices'

/**
 * Fingerprint sign-in. Body: { biometric_secret }.
 * The secret is only readable on the phone after a successful fingerprint
 * prompt. A revoked device / changed password deletes the row, so the secret
 * stops working immediately. No password, no code, no expiry.
 */
export async function POST(req: Request) {
  const { biometric_secret } = await req.json().catch(() => ({}))
  if (!biometric_secret) return NextResponse.json({ error: 'Missing secret.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: dev } = await admin.from('trusted_devices').select('id, user_id')
    .eq('biometric_hash', sha256(String(biometric_secret))).maybeSingle()
  if (!dev) return NextResponse.json({ error: 'Fingerprint sign-in is no longer valid on this phone.' }, { status: 401 })

  const { data: u } = await admin.auth.admin.getUserById(dev.user_id)
  const email = u?.user?.email
  if (!email || u.user.banned_until && new Date(u.user.banned_until) > new Date()) {
    return NextResponse.json({ error: 'This account is not available.' }, { status: 403 })
  }

  const session = await mintSession(email)
  if (!session) return NextResponse.json({ error: 'Could not start a session.' }, { status: 500 })

  await admin.from('trusted_devices').update({ last_used_at: new Date().toISOString() }).eq('id', dev.id)
  return NextResponse.json({ session: { access_token: session.access_token, refresh_token: session.refresh_token } })
}
