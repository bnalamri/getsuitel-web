/**
 * One-time demo account setup.
 * Call: GET /api/demo/setup?secret=DEMO_RESET_SECRET
 *
 * Creates:
 *  - demo@getsuitel.com auth user (email pre-confirmed, no verification email)
 *  - Updates the org name to "GetSuitel Demo"
 *  - Inserts James Carter as a pre-seeded tenant
 *
 * Safe to call multiple times — checks for existing records before inserting.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (!secret || secret !== process.env.DEMO_RESET_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      email_confirm: true,       // skip verification email
      user_metadata: {
        full_name: 'GetSuitel Demo',
        role: 'owner',
        owner_type: 'individual',
      },
    })
    if (createErr) {
      return NextResponse.json({ error: `Failed to create demo user: ${createErr.message}` }, { status: 500 })
    }
    demoUserId = newUser.user.id

    // Brief pause so the handle_new_user trigger can run and create the profile + org
    await new Promise(r => setTimeout(r, 2000))
  }

  if (!demoUserId) {
    return NextResponse.json({ error: 'Could not determine demo user ID' }, { status: 500 })
  }

  // ── 2. Get org_id from demo user profile ──────────────────────────────────
  const { data: demoProfile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', demoUserId)
    .single()

  const orgId = demoProfile?.organization_id
  if (!orgId) {
    return NextResponse.json({ error: 'Demo profile/org not found — trigger may not have run yet. Try again in a few seconds.' }, { status: 500 })
  }

  // ── 3. Update org name ────────────────────────────────────────────────────
  await admin.from('organizations').update({ name: 'GetSuitel Demo', default_currency: 'OMR' }).eq('id', orgId)

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
