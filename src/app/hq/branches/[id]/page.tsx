import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BranchCommandCenter from './BranchCommandCenter'

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  archived:  'bg-gray-100 text-gray-500',
}

export default async function BranchDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: branch } = await supabase
    .from('branches')
    .select(`
      id, name, display_name, region, city, status,
      license_fee_omr, revenue_share_pct, logo_url, created_at, updated_at,
      superadmin_id,
      profiles!branches_superadmin_id_fkey ( full_name, email, phone )
    `)
    .eq('id', params.id)
    .single()

  if (!branch) notFound()

  // Fetch all orgs for this branch upfront — used by multiple tabs
  const { data: orgsData } = await supabase
    .from('organizations')
    .select('id, name, subscription_status, subscription_plan, created_at, canceled_at')
    .eq('branch_id', params.id)
    .order('name')

  const orgs = orgsData ?? []
  const branchOrgIds = orgs.map(o => o.id)

  // Parallel stats queries
  const [
    { count: propCount },
    tenantResult,
    maintenanceOpenResult,
    maintenanceInProgressResult,
    { data: allBilling },
  ] = await Promise.all([
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', params.id),

    branchOrgIds.length > 0
      ? supabase
          .from('tenants')
          .select('id', { count: 'exact', head: true })
          .in('organization_id', branchOrgIds)
      : Promise.resolve({ count: 0, data: null, error: null }),

    branchOrgIds.length > 0
      ? supabase
          .from('maintenance_requests')
          .select('id', { count: 'exact', head: true })
          .in('organization_id', branchOrgIds)
          .eq('status', 'open')
      : Promise.resolve({ count: 0, data: null, error: null }),

    branchOrgIds.length > 0
      ? supabase
          .from('maintenance_requests')
          .select('id', { count: 'exact', head: true })
          .in('organization_id', branchOrgIds)
          .eq('status', 'in_progress')
      : Promise.resolve({ count: 0, data: null, error: null }),

    supabase
      .from('branch_billing')
      .select('month, total_revenue_omr, share_amount_omr, license_fee_omr, status')
      .eq('branch_id', params.id)
      .order('month', { ascending: false }),
  ])

  const billing        = allBilling ?? []
  const totalRevenue6mo = billing.slice(0, 6).reduce((s, r) => s + Number(r.total_revenue_omr), 0)
  const orgCount       = orgs.length
  const activeOrgCount = orgs.filter(o => o.subscription_status === 'active' || o.subscription_status === 'trialing').length
  const profile        = branch.profiles as unknown as { full_name: string | null; email: string; phone?: string | null } | null

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Back */}
      <Link
        href="/hq/branches"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Branches
      </Link>

      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{branch.display_name}</h1>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[branch.status] ?? ''}`}>
            {branch.status}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {[branch.city, branch.region].filter(Boolean).join(', ') || 'No location set'}
          {' · '}Created {new Date(branch.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <BranchCommandCenter
        branch={{
          id:               branch.id,
          display_name:     branch.display_name,
          status:           branch.status as 'active' | 'suspended' | 'archived',
          license_fee_omr:  Number(branch.license_fee_omr),
          revenue_share_pct: Number(branch.revenue_share_pct),
          created_at:       branch.created_at,
          updated_at:       branch.updated_at,
          city:             branch.city,
          region:           branch.region,
        }}
        profile={profile}
        stats={{
          orgCount,
          activeOrgCount,
          propCount:              propCount ?? 0,
          tenantCount:            (tenantResult as { count: number | null }).count ?? 0,
          maintenanceOpen:        (maintenanceOpenResult as { count: number | null }).count ?? 0,
          maintenanceInProgress:  (maintenanceInProgressResult as { count: number | null }).count ?? 0,
          totalRevenue6mo,
        }}
        orgs={orgs}
        billing={billing}
      />
    </div>
  )
}
