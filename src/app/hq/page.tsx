import { createClient } from '@/lib/supabase/server'
import { Building2, Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import OmrSymbol from '@/components/ui/OmrSymbol'

async function getHQStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [branches, orgs, billing] = await Promise.all([
    supabase.from('branches').select('id, name, status, license_fee_omr, revenue_share_pct', { count: 'exact' }),
    supabase.from('organizations').select('id, status', { count: 'exact' }),
    supabase.from('branch_billing').select('total_revenue_omr, share_amount_omr, license_fee_omr, status'),
  ])

  const activeBranches  = branches.data?.filter(b => b.status === 'active').length ?? 0
  const totalBranches   = branches.count ?? 0
  const totalOrgs       = orgs.count ?? 0

  const totalRevenue    = billing.data?.reduce((s, r) => s + Number(r.total_revenue_omr), 0) ?? 0
  const pendingPayments = billing.data?.filter(r => r.status === 'pending').length ?? 0

  return { activeBranches, totalBranches, totalOrgs, totalRevenue, pendingPayments }
}

export default async function HQDashboardPage() {
  const supabase = await createClient()
  const stats = await getHQStats(supabase)

  const { data: recentBranches } = await supabase
    .from('branches')
    .select('id, display_name, status, city, license_fee_omr, revenue_share_pct, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  const statusColor: Record<string, string> = {
    active:    'bg-green-100 text-green-700',
    suspended: 'bg-yellow-100 text-yellow-700',
    archived:  'bg-gray-100 text-gray-500',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HQ Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Global overview of all GetSuitel branches</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Active Branches" value={stats.activeBranches}
          sub={`${stats.totalBranches} total`} color="yellow" />
        <StatCard icon={Users} label="Total Orgs" value={stats.totalOrgs}
          sub="across all branches" color="blue" />
        <StatCard icon={DollarSign} label={<span className="flex items-center gap-1">Total Revenue <OmrSymbol variant="dark" size={14} /></span>} value={stats.totalRevenue.toFixed(3)}
          sub="all billing records" color="green" />
        <StatCard icon={AlertCircle} label="Pending Payments" value={stats.pendingPayments}
          sub="branch billing" color="red" />
      </div>

      {/* Branch list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Branches</h2>
          <a href="/hq/branches" className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
            View all →
          </a>
        </div>
        {recentBranches && recentBranches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-5 py-3 text-left">Branch</th>
                  <th className="px-5 py-3 text-left">City</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right"><span className="flex items-center justify-end gap-1">License Fee <OmrSymbol variant="dark" size={13} /></span></th>
                  <th className="px-5 py-3 text-right">Rev Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentBranches.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <a href={`/hq/branches/${b.id}`} className="hover:text-yellow-600">
                        {b.display_name}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{b.city ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColor[b.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">{Number(b.license_fee_omr).toFixed(3)}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{b.revenue_share_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-gray-400">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No branches yet</p>
            <p className="text-sm mt-1">
              <a href="/hq/branches" className="text-yellow-600 hover:underline">Create your first branch →</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: React.ReactNode; value: string | number; sub: string; color: string
}) {
  const colors: Record<string, string> = {
    yellow: 'bg-yellow-100 text-yellow-700',
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-green-100 text-green-700',
    red:    'bg-red-100 text-red-700',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  )
}
