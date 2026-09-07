import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Super Admin tier of the HQ → Super Admin → Owner feature-flag cascade.
// A Super Admin sees all 9 flags for their own branch, can set a
// branch-wide default, and can override per-organization within that
// branch — but never above the ceiling HQ has set for this branch.

async function getMyBranch(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('branches').select('id').eq('superadmin_id', userId).single()
  return data?.id as string | undefined
}

// GET — list all 9 flags with their HQ ceiling + this branch's own values
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const branchId = await getMyBranch(supabase, user.id)
  if (!branchId) return NextResponse.json({ error: 'No branch assigned' }, { status: 404 })

  const [{ data: platformFlags }, { data: branchFlags }, { data: orgs }] = await Promise.all([
    supabase.from('platform_feature_flags').select('feature_key, label, description, enabled_globally, branch_overrides').order('feature_key'),
    supabase.from('branch_feature_flags').select('feature_key, enabled_branchwide, org_overrides').eq('branch_id', branchId),
    supabase.from('organizations').select('id, name').eq('branch_id', branchId).order('name'),
  ])

  const branchFlagMap = new Map((branchFlags ?? []).map(f => [f.feature_key, f]))

  const flags = (platformFlags ?? []).map(pf => {
    const branchOverride = (pf.branch_overrides as Record<string, boolean> | null)?.[branchId]
    const hqCeiling = branchOverride ?? pf.enabled_globally  // HQ's effective setting for this branch
    const bf = branchFlagMap.get(pf.feature_key)
    return {
      feature_key: pf.feature_key,
      label: pf.label,
      description: pf.description,
      hq_ceiling: hqCeiling,
      enabled_branchwide: bf?.enabled_branchwide ?? true,
      org_overrides: (bf?.org_overrides as Record<string, boolean> | null) ?? {},
    }
  })

  return NextResponse.json({ flags, organizations: orgs ?? [] })
}

// PATCH — branch-wide toggle or per-org override, both capped by HQ ceiling
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const branchId = await getMyBranch(supabase, user.id)
  if (!branchId) return NextResponse.json({ error: 'No branch assigned' }, { status: 404 })

  const body = await req.json()
  const { feature_key, enabled_branchwide, org_id, override } = body
  if (!feature_key) return NextResponse.json({ error: 'feature_key required' }, { status: 400 })

  // Resolve the HQ ceiling for this branch — the branch may never exceed it.
  const { data: pf } = await supabase
    .from('platform_feature_flags')
    .select('enabled_globally, branch_overrides')
    .eq('feature_key', feature_key)
    .single()
  if (!pf) return NextResponse.json({ error: 'Unknown feature_key' }, { status: 404 })
  const hqCeiling = (pf.branch_overrides as Record<string, boolean> | null)?.[branchId] ?? pf.enabled_globally

  // Branch-wide toggle
  if (typeof enabled_branchwide === 'boolean') {
    if (enabled_branchwide && !hqCeiling) {
      return NextResponse.json({ error: 'This feature is disabled by HQ for your branch' }, { status: 403 })
    }
    const { error } = await supabase
      .from('branch_feature_flags')
      .upsert({ feature_key, branch_id: branchId, enabled_branchwide, updated_at: new Date().toISOString() }, { onConflict: 'feature_key,branch_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Per-organization override
  if (org_id !== undefined) {
    // Verify the org actually belongs to this branch before touching it.
    const { data: org } = await supabase.from('organizations').select('id').eq('id', org_id).eq('branch_id', branchId).single()
    if (!org) return NextResponse.json({ error: 'Organization not found in your branch' }, { status: 404 })

    if (override === true && !hqCeiling) {
      return NextResponse.json({ error: 'This feature is disabled by HQ for your branch' }, { status: 403 })
    }

    const { data: existing } = await supabase
      .from('branch_feature_flags')
      .select('org_overrides')
      .eq('feature_key', feature_key)
      .eq('branch_id', branchId)
      .single()

    const overrides = (existing?.org_overrides as Record<string, boolean> | null) ?? {}
    if (override === null || override === undefined) {
      delete overrides[org_id]
    } else {
      overrides[org_id] = override
    }

    const { error } = await supabase
      .from('branch_feature_flags')
      .upsert({ feature_key, branch_id: branchId, org_overrides: overrides, updated_at: new Date().toISOString() }, { onConflict: 'feature_key,branch_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Provide enabled_branchwide or org_id + override' }, { status: 400 })
}
