// @ts-nocheck
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { getAuthedUserId } from '@/lib/apiAuth'
import { DEVICE_COOKIE, sha256 } from '@/lib/trustedDevices'

/** GET: list my trusted devices (web browsers + phones). `current` marks the caller's own device. */
export async function GET(req: Request) {
  const userId = await getAuthedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jar = await cookies()
  const token = req.headers.get('x-device-token') || jar.get(DEVICE_COOKIE)?.value
  const currentHash = token ? sha256(token) : null

  const admin = createAdminClient()
  const { data } = await admin.from('trusted_devices')
    .select('id, kind, label, token_hash, biometric_hash, created_at, last_used_at')
    .eq('user_id', userId).order('last_used_at', { ascending: false })

  return NextResponse.json({
    devices: (data ?? []).map(d => ({
      id: d.id, kind: d.kind, label: d.label, created_at: d.created_at, last_used_at: d.last_used_at,
      fingerprint: !!d.biometric_hash, current: currentHash === d.token_hash,
    })),
  })
}

/** DELETE ?id=<device id>: remove a device (kills its trust + fingerprint). */
export async function DELETE(req: Request) {
  const userId = await getAuthedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('trusted_devices').delete().eq('id', id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
