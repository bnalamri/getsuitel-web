import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 300 // cache 5 min

// Public — returns HQ's default plan catalogue, or a specific branch's
// plans (its own overrides layered on top of the HQ defaults for any slug
// it hasn't customized) when ?branch=<branch id> is given. See
// 20260915_branch_pricing_plans.sql for why plans became branch-aware —
// every plan row carries its own `currency`, so callers no longer need a
// separate /api/currency lookup to know how to render the price.
//
// Called with no `branch` param by: the homepage's HQ-default pricing
// section, the register page's plan picker, and ChangeSubscriptionForm —
// all unchanged, still just the HQ catalogue. The new /pricing page is
// the only caller that passes `branch`.
export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get('branch')
    const admin = createAdminClient()

    const { data: defaults, error } = await admin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    if (error) throw error

    if (!branchId) return NextResponse.json(defaults ?? [])

    const { data: overrides, error: ovErr } = await admin
      .from('branch_subscription_plans')
      .select('*')
      .eq('branch_id', branchId)
    if (ovErr) throw ovErr

    const overrideMap = new Map((overrides ?? []).map(o => [o.slug, o]))
    const merged = (defaults ?? [])
      .map(def => {
        const ov = overrideMap.get(def.slug)
        if (!ov) return def
        return ov.is_active ? ov : null // branch explicitly hid this plan
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    return NextResponse.json(merged)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load plans'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
