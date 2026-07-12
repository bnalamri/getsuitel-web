/**
 * Daily demo data reset — called by Vercel cron at 20:00 UTC (midnight Oman).
 * Deletes all created properties, units, contracts, invoices, and maintenance
 * for the demo org. Keeps: auth user, org, and the pre-seeded James Carter tenant.
 *
 * Also accepts GET with ?secret=... for manual resets.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

async function runReset() {
  const admin = createAdminClient()
  const demoEmail = process.env.DEMO_EMAIL!

  // ── Find demo user ─────────────────────────────────────────────────────────
  const { data: userResult } = await admin.auth.admin.getUserByEmail(demoEmail)
  if (!userResult?.user) {
    return { error: 'Demo user not found — run /api/demo/setup first' }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', userResult.user.id)
    .single()

  const orgId = profile?.organization_id
  if (!orgId) return { error: 'Demo org not found' }

  // ── Delete in FK-safe order ────────────────────────────────────────────────
  // invoices → contracts → cheques → maintenance → units → properties
  await admin.from('invoices').delete().eq('organization_id', orgId)
  await admin.from('cheques').delete().eq('organization_id', orgId)
  await admin.from('payment_receipts').delete().eq('organization_id', orgId)
  await admin.from('maintenance_requests').delete().eq('organization_id', orgId)
  await admin.from('contracts').delete().eq('organization_id', orgId)
  await admin.from('units').delete().eq('organization_id', orgId)
  await admin.from('properties').delete().eq('organization_id', orgId)

  // ── Re-seed James Carter if he was accidentally removed ───────────────────
  const { data: existingTenant } = await admin
    .from('tenants')
    .select('id')
    .eq('organization_id', orgId)
    .eq('full_name', 'James Carter')
    .maybeSingle()

  if (!existingTenant) {
    await admin.from('tenants').insert({
      full_name: 'James Carter',
      organization_id: orgId,
      phone: '+96891234567',
      national_id: 'A12345678',
    })
  }

  return { ok: true, orgId, resetAt: new Date().toISOString() }
}

// Vercel cron calls GET (no auth header available in cron)
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  const cronHeader = request.headers.get('x-vercel-cron-signature') // Vercel adds this

  if (!cronHeader && secret !== process.env.DEMO_RESET_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runReset()
  if ('error' in result) return NextResponse.json(result, { status: 500 })
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  // Vercel cron can also POST — allow without secret since cron signature is added
  const result = await runReset()
  if ('error' in result) return NextResponse.json(result, { status: 500 })
  return NextResponse.json(result)
}
