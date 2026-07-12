/**
 * Daily demo data reset — called by Vercel cron at 20:00 UTC (midnight Oman).
 * Deletes all data for the demo org (properties, units, contracts, invoices,
 * maintenance), then re-seeds a fresh complete dataset.
 *
 * Also accepts GET with ?secret=... for manual resets.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { seedDemoData } from '../seed'

async function runReset() {
  const admin       = createAdminClient()
  const demoEmail   = process.env.DEMO_EMAIL!
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // ── Find demo user via REST (SDK has no getUserByEmail in v2) ─────────────
  const authRes = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(demoEmail)}`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  )
  const authJson = await authRes.json()
  const authUsers = authJson.users ?? (Array.isArray(authJson) ? authJson : [])
  const demoUser  = authUsers.find((u: { email: string }) => u.email === demoEmail)

  if (!demoUser) {
    return { error: 'Demo user not found — run /api/demo/setup first' }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', demoUser.id)
    .single()

  const orgId = profile?.organization_id
  if (!orgId) return { error: 'Demo org not found' }

  // ── Delete in FK-safe order ────────────────────────────────────────────────
  await admin.from('invoices').delete().eq('organization_id', orgId)
  await admin.from('cheques').delete().eq('organization_id', orgId)
  await admin.from('payment_receipts').delete().eq('organization_id', orgId)
  await admin.from('maintenance_requests').delete().eq('organization_id', orgId)
  await admin.from('contracts').delete().eq('organization_id', orgId)
  await admin.from('units').delete().eq('organization_id', orgId)
  await admin.from('properties').delete().eq('organization_id', orgId)
  // Delete tenants but keep the org itself
  await admin.from('tenants').delete().eq('organization_id', orgId)

  // ── Re-seed full demo dataset ──────────────────────────────────────────────
  const seeded = await seedDemoData(orgId, admin)

  return { ok: true, orgId, resetAt: new Date().toISOString(), seeded }
}

export async function GET(request: NextRequest) {
  const secret    = request.nextUrl.searchParams.get('secret')
  const cronHeader = request.headers.get('x-vercel-cron-signature')

  if (!cronHeader && secret !== process.env.DEMO_RESET_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runReset()
    if ('error' in result) return NextResponse.json(result, { status: 500 })
    return NextResponse.json(result)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[demo/reset]', detail)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}

export async function POST() {
  try {
    const result = await runReset()
    if ('error' in result) return NextResponse.json(result, { status: 500 })
    return NextResponse.json(result)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
