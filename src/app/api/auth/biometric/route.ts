// @ts-nocheck
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAuthedUserId } from '@/lib/apiAuth'
import { randomToken, sha256 } from '@/lib/trustedDevices'

/**
 * POST { device_token }: turn fingerprint sign-in ON for this (already trusted) phone.
 * Returns a fresh biometric secret ONCE; the app stores it in Android Keystore
 * behind a biometric prompt. Only its hash is kept here.
 */
export async function POST(req: Request) {
  const userId = await getAuthedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { device_token } = await req.json().catch(() => ({}))
  if (!device_token) return NextResponse.json({ error: 'device_token required' }, { status: 400 })

  const admin = createAdminClient()
  const secret = randomToken()
  const { data, error } = await admin.from('trusted_devices')
    .update({ biometric_hash: sha256(secret) })
    .eq('user_id', userId).eq('token_hash', sha256(device_token)).eq('kind', 'phone')
    .select('id').maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'This phone is not a trusted device.' }, { status: 400 })
  return NextResponse.json({ biometric_secret: secret, device_id: data.id })
}

/** DELETE { device_token }: turn fingerprint sign-in OFF for this phone (device stays trusted). */
export async function DELETE(req: Request) {
  const userId = await getAuthedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { device_token } = await req.json().catch(() => ({}))
  if (!device_token) return NextResponse.json({ error: 'device_token required' }, { status: 400 })
  const admin = createAdminClient()
  await admin.from('trusted_devices').update({ biometric_hash: null })
    .eq('user_id', userId).eq('token_hash', sha256(device_token))
  return NextResponse.json({ ok: true })
}
