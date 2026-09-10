// @ts-nocheck
import { createAdminClient } from '@/lib/supabase/server'

// The single source of truth for "is this feature actually on for this org"
// — every tenant/owner-facing gate (payment methods, maintenance submission,
// notices, tenant portal access, expenses, utility bills, staff invitations)
// should call isFeatureEnabled() rather than re-deriving the cascade itself.
//
// Mirrors the ceiling logic already used by the admin-facing flag screens
// (see /api/owner/flags/route.ts's getCeiling), but always runs on the
// service-role client so it works regardless of the caller's role or RLS —
// a tenant has no read policy on platform_feature_flags/branch_feature_flags/
// org_feature_flags today, and adding one would open those tables to every
// authenticated user just to answer a yes/no question this helper already
// answers safely server-side.
//
// Only 6 of the 9 flags are tenant-facing (have their own org_feature_flags
// row an Owner can further restrict): bank_transfer, cheque_payments,
// mobile_wallet, maintenance, notices_system, tenant_portal. The other 3 —
// expense_tracking, utility_bills, staff_invitations — gate an owner's own
// capability with no further toggle below Super Admin, so for those the
// ceiling IS the effective value.
const TENANT_FACING_KEYS = ['bank_transfer', 'cheque_payments', 'mobile_wallet', 'maintenance', 'notices_system', 'tenant_portal']

async function getCeiling(admin: ReturnType<typeof createAdminClient>, featureKey: string, branchId: string | null, orgId: string | null) {
  const { data: pf } = await admin
    .from('platform_feature_flags')
    .select('enabled_globally, branch_overrides')
    .eq('feature_key', featureKey)
    .single()
  if (!pf) return true // flag row missing — fail open rather than silently breaking the feature for everyone
  const hqCeiling = branchId ? ((pf.branch_overrides as Record<string, boolean> | null)?.[branchId] ?? pf.enabled_globally) : pf.enabled_globally
  if (!hqCeiling || !branchId) return hqCeiling

  const { data: bf } = await admin
    .from('branch_feature_flags')
    .select('enabled_branchwide, org_overrides')
    .eq('feature_key', featureKey)
    .eq('branch_id', branchId)
    .single()
  const orgOverride = orgId ? (bf?.org_overrides as Record<string, boolean> | null)?.[orgId] : undefined
  const branchEffective = orgOverride ?? bf?.enabled_branchwide ?? true
  return hqCeiling && branchEffective
}

/**
 * Whole-cascade effective value for a given org + flag. Returns true (open)
 * when orgId is null — callers with no org context (HQ/Super Admin staff)
 * are never gated by an org-level flag.
 */
export async function isFeatureEnabled(featureKey: string, orgId: string | null | undefined): Promise<boolean> {
  if (!orgId) return true
  const admin = createAdminClient()

  const { data: org } = await admin.from('organizations').select('branch_id').eq('id', orgId).single()
  const branchId = (org?.branch_id as string | undefined) ?? null

  const ceiling = await getCeiling(admin, featureKey, branchId, orgId)
  if (!ceiling) return false
  if (!TENANT_FACING_KEYS.includes(featureKey)) return true

  const { data: of } = await admin
    .from('org_feature_flags')
    .select('enabled')
    .eq('feature_key', featureKey)
    .eq('organization_id', orgId)
    .single()
  return (of?.enabled as boolean | undefined) ?? true
}

/** Batched version for pages/components that need several flags at once — one
 * round trip of parallel checks instead of N sequential awaits. */
export async function getEnabledFeatures(featureKeys: string[], orgId: string | null | undefined): Promise<Record<string, boolean>> {
  const results = await Promise.all(featureKeys.map(key => isFeatureEnabled(key, orgId)))
  return Object.fromEntries(featureKeys.map((key, i) => [key, results[i]]))
}
