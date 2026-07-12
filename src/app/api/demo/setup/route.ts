/**
 * One-time demo account setup.
 * GET /api/demo/setup?secret=DEMO_RESET_SECRET
 *
 * Creates the demo auth user, profile, org, and a full pre-seeded dataset
 * (property, 4 units, 2 tenants, 2 contracts, 7 invoices, 2 maintenance requests).
 * Safe to call multiple times — fully idempotent.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { seedDemoData } from '../seed'

export async function GET(request: NextRequest) {
  try {
    return await _handleSetup(request)
  } catch (err) {
    const detail = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    console.error('[demo/setup] Uncaught:', detail)
    return NextResponse.json({ error: 'Uncaught exception', detail }, { status: 500 })
  }
}

async function _handleSetup(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.DEMO_RESET_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const demoEmail    = process.env.DEMO_EMAIL!
  const demoPassword = process.env.DEMO_PASSWORD!
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Helper: find user by email via REST (SDK has no getUserByEmail in v2)
  async function findUserByEmail(email: string): Promise<string | null> {
    const res = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    )
    if (!res.ok) return null
    const json = await res.json()
    const users = json.users ?? (Array.isArray(json) ? json : [])
    return users.find((u: { email: string }) => u.email === email)?.id ?? null
  }

  // ── 1. Create demo auth user if not exists ────────────────────────────────
  let demoUserId: string | null = await findUserByEmail(demoEmail)

  if (!demoUserId) {
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'GetSuitel Demo',
        role: 'owner',
        owner_type: 'individual',
        org_name: 'GetSuitel Demo',  // triggers org creation in handle_new_user
        plan: 'pro',
        lang_pref: 'en',
      },
    })

    if (createErr) {
      // GoTrue returns {} when trigger errors but the user may still be created
      demoUserId = await findUserByEmail(demoEmail)
      if (!demoUserId) {
        return NextResponse.json(
          { error: `Failed to create demo user: ${createErr.message}` },
          { status: 500 }
        )
      }
    } else {
      demoUserId = newUser.user.id
    }

    // Wait for handle_new_user trigger to create profile + org
    await new Promise(r => setTimeout(r, 3000))
  }

  // ── 2. Resolve org_id ─────────────────────────────────────────────────────
  let orgId: string | null = null

  const { data: demoProfile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', demoUserId)
    .single()
  orgId = demoProfile?.organization_id ?? null

  if (!orgId) {
    const { data: orgByOwner } = await admin
      .from('organizations')
      .select('id')
      .eq('owner_id', demoUserId)
      .maybeSingle()
    if (orgByOwner?.id) {
      orgId = orgByOwner.id
      await admin.from('profiles').update({ organization_id: orgId }).eq('id', demoUserId)
    }
  }

  if (!orgId) {
    return NextResponse.json(
      { error: 'Demo org not found — trigger may not have run. Try again in 5 seconds.' },
      { status: 500 }
    )
  }

  // ── 3. Update org name + currency ─────────────────────────────────────────
  await admin
    .from('organizations')
    .update({ name: 'GetSuitel Demo', default_currency: 'OMR' })
    .eq('id', orgId)

  // ── 4. Seed full demo dataset ─────────────────────────────────────────────
  const seeded = await seedDemoData(orgId, admin)

  return NextResponse.json({ ok: true, orgId, userId: demoUserId, seeded })
}
