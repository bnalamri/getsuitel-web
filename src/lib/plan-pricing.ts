// Shared helper for looking up REAL, live subscription plan prices —
// see 20260915_branch_pricing_plans.sql. Every branch may override the
// HQ default catalogue's price/currency per slug; a branch that hasn't
// customized a slug falls back to the HQ default (subscription_plans).
//
// This exists because several revenue reports (FinancialReportPDF,
// revenue-forecast) previously hardcoded their own stale, disconnected
// PLAN_PRICE maps in USD/OMR that never matched what any org was
// actually being charged, and never varied by branch. Those maps are
// gone — this is the one place plan price + currency should be read
// from, mirroring the exact merge logic already used by
// GET /api/plans.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export type PlanPrice = { price: number; currency: string }

/**
 * Returns a slug -> { price, currency } map for a given branch (its
 * own overrides layered on the HQ defaults), or just the HQ defaults
 * when branchId is null/undefined.
 */
export async function getPlanPricesForBranch(
  supabase: AnyClient,
  branchId: string | null | undefined,
): Promise<Record<string, PlanPrice>> {
  const { data: defaults } = await supabase
    .from('subscription_plans')
    .select('slug, price_monthly, currency, is_active')

  const map: Record<string, PlanPrice> = {}
  for (const p of defaults ?? []) {
    map[p.slug] = { price: Number(p.price_monthly), currency: p.currency ?? 'OMR' }
  }

  if (!branchId) return map

  const { data: overrides } = await supabase
    .from('branch_subscription_plans')
    .select('slug, price_monthly, currency, is_active')
    .eq('branch_id', branchId)

  for (const o of overrides ?? []) {
    if (o.is_active === false) continue
    map[o.slug] = { price: Number(o.price_monthly), currency: o.currency ?? 'OMR' }
  }

  return map
}

/**
 * Builds a branchId -> { slug -> PlanPrice } lookup for many branches
 * in one pass — for reports that span every branch at once (e.g. the
 * platform-wide Financial Report) rather than a single superadmin's
 * own branch.
 */
export async function getPlanPricesForAllBranches(
  supabase: AnyClient,
): Promise<{ hqDefaults: Record<string, PlanPrice>; byBranch: Record<string, Record<string, PlanPrice>> }> {
  const [{ data: defaults }, { data: overrides }] = await Promise.all([
    supabase.from('subscription_plans').select('slug, price_monthly, currency, is_active'),
    supabase.from('branch_subscription_plans').select('branch_id, slug, price_monthly, currency, is_active'),
  ])

  const hqDefaults: Record<string, PlanPrice> = {}
  for (const p of defaults ?? []) {
    hqDefaults[p.slug] = { price: Number(p.price_monthly), currency: p.currency ?? 'OMR' }
  }

  const byBranch: Record<string, Record<string, PlanPrice>> = {}
  for (const o of overrides ?? []) {
    if (o.is_active === false) continue
    if (!byBranch[o.branch_id]) byBranch[o.branch_id] = { ...hqDefaults }
    byBranch[o.branch_id][o.slug] = { price: Number(o.price_monthly), currency: o.currency ?? 'OMR' }
  }

  return { hqDefaults, byBranch }
}

/** Resolves one org's actual plan price, given its branch_id + plan slug. */
export function resolveOrgPlanPrice(
  orgBranchId: string | null | undefined,
  planSlug: string,
  lookup: { hqDefaults: Record<string, PlanPrice>; byBranch: Record<string, Record<string, PlanPrice>> },
): PlanPrice {
  if (orgBranchId && lookup.byBranch[orgBranchId]?.[planSlug]) return lookup.byBranch[orgBranchId][planSlug]
  return lookup.hqDefaults[planSlug] ?? { price: 0, currency: 'OMR' }
}
