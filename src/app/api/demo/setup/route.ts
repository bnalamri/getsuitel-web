/**
 * One-time demo account setup.
 * Call: GET /api/demo/setup?secret=DEMO_RESET_SECRET
 *
 * Creates:
 *  - demo@getsuitel.com auth user (email pre-confirmed, no verification email)
 *  - handle_new_user trigger creates profile + org (org_name passed in metadata)
 *  - Updates the org name to "GetSuitel Demo" and sets OMR currency
 *  - Inserts James Carter as a pre-seeded tenant
 *
 * Safe to call multiple times — checks for existing records before inserting.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

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

  // Quick env check — values hidden, just presence
  const envCheck = {
    DEMO_EMAIL: !!process.env.DEMO_EMAIL,
    DEMO_PASSWORD: !!process.env.DEMO_PASSWORD,
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
  console.log('[demo/setup] env:', JSON.stringify(envCheck))

  const admin = createAdminClient()
  const demoEmail = process.env.DEMO_EMAIL!
  const demoPassword = process.env.DEMO_PASSWORD!

  // ── 1. Create demo auth user if not exists ────────────────────────────────
  let demoUserId: string | null = null

  const { data: existingUser } = await admin.auth.admin.getUserByEmail(demoEmail)
  if (existingUser?.user) {
    demoUserId = existingUser.user.id
  } else {
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,        // skip verification email
      user_metadata: {
        full_name: 'GetSuitel Demo',
        role: 'owner',
        owner_type: 'individual',
        org_name: 'GetSuitel Demo',   // ← required: tells trigger to create the org
        plan: 'pro',
        lang_pref: 'en',
      },
    })

    if (createErr) {
      // GoTrue sometimes returns {} when a trigger errors but the user IS created.
      // Re-check by email before giving up.
      const { data: recheckUser } = await admin.auth.admin.getUserByEmail(demoEmail)
      if (!recheckUser?.user) {
        return NextResponse.json(
          { error: `Failed to create demo user: ${createErr.message}` },
          { status: 500 }
        )
      }
      demoUserId = recheckUser.user.id
    } else {
      demoUserId = newUser.user.id
    }

    // Wait for handle_new_user trigger to create profile + org
    await new Promise(r => setTimeout(r, 3000))
  }

  if (!demoUserId) {
    return NextResponse.json({ error: 'Could not determine demo user ID' }, { status: 500 })
  }

  // ── 2. Get org_id (from profile, or fallback to organizations table) ───────
  let orgId: string | null = null

  const { data: demoProfile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', demoUserId)
    .single()

  orgId = demoProfile?.organization_id ?? null

  // Fallback: look up org directly by owner_id (in case profile link wasn't set yet)
  if (!orgId) {
    const { data: orgByOwner } = await admin
      .from('organizations')
      .select('id')
      .eq('owner_id', demoUserId)
      .maybeSingle()

    if (orgByOwner?.id) {
      orgId = orgByOwner.id
      // Backfill the profile link
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

  // ── 4. Seed James Carter tenant (idempotent) ──────────────────────────────
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

  return NextResponse.json({ ok: true, orgId, userId: demoUserId })
}
