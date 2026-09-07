import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Owner tier of the HQ → Super Admin → Owner feature-flag cascade.
// Only the 6 tenant-facing flags apply here — the rest (expense tracking,
// utility bills, staff invitations) gate an owner's own capability with no
// "hand it down to a tenant" version, so they stop at Super Admin.
const TENANT_FACING_KEYS = ['bank_transfer', 'cheque_payments', 'mobile_wallet', 'maintenance', 'notices_system', 'tenant_portal']

// Ceiling for a given org+flag is live-computed from both parent tiers —
// never trusted from a possibly-stale stored value — so if HQ or the
// branch admin tightens a setting after an org already had it on, the org
// is capped immediately rather than waiting for someone to re-save it.
async function getCeiling(supabase: Awaited<ReturnType<typeof createClient>>, featureKey: string, branchId: string | null) {
  const { data: pf } = await supabase
    .from('platform_feature_flags')
    .select('enabled_globally, branch_overrides')
    .eq('feature_key', featureKey)
    .single()
  if (!pf) return false
  const hqCeiling = branchId ? ((pf.branch_overrides as Record<string, boolean> | null)?.[branchId] ?? pf.enabled_globally) : pf.enabled_globally
  if (!hqCeiling || !branchId) return hqCeiling

  const { data: bf } = await supabase
    .from('branch_feature_flags')
    .select('enabled_branchwide')
    .eq('feature_key', featureKey)
    .eq('branch_id', branchId)
    .single()
  const branchEffective = bf?.enabled_branchwide ?? true
  return hqCeiling && branchEffective
}

async function getMyOrgAndBranch(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', userId).single()
  const orgId = profile?.organization_id as string | undefined
  if (!orgId) return { orgId: undefined, branchId: undefined }
  const { data: org } = await supabase.from('organizations').select('branch_id').eq('id', orgId).single()
  return { orgId, branchId: (org?.branch_id as string | undefined) ?? undefined }
}

// GET — the 6 tenant-facing flags with their ceiling + this org's own value
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { orgId, branchId } = await getMyOrgAndBranch(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization assigned' }, { status: 404 })

  const [{ data: platformFlags }, { data: orgFlags }] = await Promise.all([
    supabase.from('platform_feature_flags').select('feature_key, label, description').in('feature_key', TENANT_FACING_KEYS).order('feature_key'),
    supabase.from('org_feature_flags').select('feature_key, enabled').eq('organization_id', orgId),
  ])

  const orgFlagMap = new Map((orgFlags ?? []).map(f => [f.feature_key, f.enabled]))

  const flags = await Promise.all((platformFlags ?? []).map(async pf => ({
    feature_key: pf.feature_key,
    label: pf.label,
    description: pf.description,
    ceiling: await getCeiling(supabase, pf.feature_key, branchId ?? null),
    enabled: orgFlagMap.get(pf.feature_key) ?? true,
  })))

  return NextResponse.json({ flags })
}

// PATCH — org-wide toggle, capped by the Super Admin / HQ ceiling
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { orgId, branchId } = await getMyOrgAndBranch(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization assigned' }, { status: 404 })

  const body = await req.json()
  const { feature_key, enabled } = body
  if (!feature_key || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'feature_key and enabled (boolean) required' }, { status: 400 })
  }
  if (!TENANT_FACING_KEYS.includes(feature_key)) {
    return NextResponse.json({ error: 'This feature is not configurable at the owner level' }, { status: 400 })
  }

  if (enabled) {
    const ceiling = await getCeiling(supabase, feature_key, branchId ?? null)
    if (!ceiling) {
      return NextResponse.json({ error: 'This feature is disabled for your branch — contact your branch administrator' }, { status: 403 })
    }
  }

  const { error } = await supabase
    .from('org_feature_flags')
    .upsert({ feature_key, organization_id: orgId, enabled, updated_at: new Date().toISOString() }, { onConflict: 'feature_key,organization_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
