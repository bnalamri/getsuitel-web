/**
 * Branch limit enforcement helpers.
 * Called from API POST routes before inserting units, tenants, or staff.
 */
import { SupabaseClient } from '@supabase/supabase-js'

type LimitKey = 'max_units' | 'max_staff' | 'max_tenants'

/**
 * Returns { allowed: true } or { allowed: false, current, limit, label }
 */
export async function checkBranchLimit(
  supabase: SupabaseClient,
  organizationId: string,
  limitKey: LimitKey,
): Promise<{ allowed: true } | { allowed: false; current: number; limit: number; label: string }> {

  // 1. Get branch_id + the limit value for this org
  const { data: org } = await supabase
    .from('organizations')
    .select('branch_id')
    .eq('id', organizationId)
    .single()

  if (!org?.branch_id) return { allowed: true } // no branch → no enforcement

  const { data: branch } = await supabase
    .from('branches')
    .select(`id, ${limitKey}`)
    .eq('id', org.branch_id)
    .single()

  const limit: number | null = branch?.[limitKey as keyof typeof branch] as number | null
  if (limit == null) return { allowed: true } // null = unlimited

  // 2. Get all org IDs in this branch
  const { data: branchOrgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('branch_id', org.branch_id)

  const orgIds = (branchOrgs ?? []).map(o => o.id)
  if (orgIds.length === 0) return { allowed: true }

  // 3. Count current records across all branch orgs
  let current = 0
  const LABELS: Record<LimitKey, string> = {
    max_units:   'units',
    max_staff:   'staff members',
    max_tenants: 'tenants',
  }

  if (limitKey === 'max_units') {
    const { count } = await supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .in('organization_id', orgIds)
    current = count ?? 0
  } else if (limitKey === 'max_tenants') {
    const { count } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .in('organization_id', orgIds)
    current = count ?? 0
  } else if (limitKey === 'max_staff') {
    // Count accepted staff invitations (property_manager + financial_manager)
    const { count } = await supabase
      .from('staff_invitations')
      .select('id', { count: 'exact', head: true })
      .in('organization_id', orgIds)
      .not('accepted_at', 'is', null)
    current = count ?? 0
  }

  if (current >= limit) {
    return { allowed: false, current, limit, label: LABELS[limitKey] }
  }
  return { allowed: true }
}
