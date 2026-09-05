import { createClient } from '@/lib/supabase/server'
import BranchesClient from './BranchesClient'

export default async function HQBranchesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profile?.role === 'hq_admin'

  const { data: branches } = await supabase
    .from('branches')
    .select(`
      id, name, display_name, region, city, status,
      license_fee_omr, revenue_share_pct, logo_url, created_at,
      superadmin_id,
      profiles!branches_superadmin_id_fkey ( full_name, email )
    `)
    .order('created_at', { ascending: false })

  // Count orgs per branch (and how many have no branch at all — rebuild step 7)
  const { data: orgCounts } = await supabase
    .from('organizations')
    .select('branch_id')

  const countMap: Record<string, number> = {}
  let unassignedCount = 0
  orgCounts?.forEach(r => {
    if (r.branch_id) countMap[r.branch_id] = (countMap[r.branch_id] ?? 0) + 1
    else unassignedCount += 1
  })

  const enriched = (branches ?? []).map(b => ({
    ...b,
    org_count: countMap[b.id] ?? 0,
  }))

  return <BranchesClient branches={enriched} isAdmin={isAdmin} unassignedCount={unassignedCount} />
}
