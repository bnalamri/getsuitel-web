import { createAdminClient } from '@/lib/supabase/server'
import { CreditCard } from 'lucide-react'
import BranchFilterSelect from '../_components/BranchFilterSelect'
import ExportCSVButton from '../_components/ExportCSVButton'

const PLAN_COLORS: Record<string, string> = {
  free:       'bg-gray-100 text-gray-600',
  basic:      'bg-blue-100 text-blue-700',
  pro:        'bg-purple-100 text-purple-700',
  enterprise: 'bg-yellow-100 text-yellow-700',
}

export default async function HQSubscriptionsReportPage({
  searchParams,
}: { searchParams: Promise<{ branch?: string }> }) {
  const supabase = createAdminClient()
  const { branch: branchId } = await searchParams

  const [{ data: branches }, { data: orgs }] = await Promise.all([
    supabase.from('branches').select('id, display_name').in('status', ['active', 'suspended']).order('display_name'),
    supabase
      .from('organizations')
      .select('id, name, subscription_plan, subscription_status, branch_id, branches ( display_name )')
      .not('status', 'eq', 'canceled')
      .order('subscription_plan'),
  ])

  type OrgRow = {
    id: string; name: string; subscription_plan: string | null; subscription_status: string | null
    branch_id: string | null; branches: { display_name: string } | null
  }

  let rows = ((orgs ?? []) as OrgRow[]).map(o => ({
    id:             o.id,
    org:            o.name,
    branch:         o.branches?.display_name ?? '—',
    branch_id:      o.branch_id,
    plan:           o.subscription_plan ?? 'free',
    sub_status:     o.subscription_status ?? '—',
  }))

  if (branchId) rows = rows.filter(r => r.branch_id === branchId)

  // Aggregate: plan → branch → count
  const planTotals: Record<string, number> = {}
  rows.forEach(r => { planTotals[r.plan] = (planTotals[r.plan] ?? 0) + 1 })

  // Branch × plan matrix
  const branchPlanMap: Record<string, Record<string, number>> = {}
  rows.forEach(r => {
    if (!branchPlanMap[r.branch]) branchPlanMap[r.branch] = {}
    branchPlanMap[r.branch][r.plan] = (branchPlanMap[r.branch][r.plan] ?? 0) + 1
  })
  const branchRows = Object.entries(branchPlanMap)
    .map(([branch, plans]) => ({ branch, ...plans, total: Object.values(plans).reduce((s, v) => s + v, 0) }))
    .sort((a, b) => b.total - a.total)

  const plans = ['enterprise', 'pro', 'basic', 'free']

  const csvData    = rows.map(({ id: _, branch_id: __, ...r }) => r)
  const csvHeaders = ['Organisation', 'Branch', 'Plan', 'Subscription Status']

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-sm text-gray-500">Organisation plan distribution across branches</p>
        </div>
        <div className="flex items-center gap-2">
          <BranchFilterSelect branches={branches ?? []} selected={branchId ?? null} basePath="/hq/reports/subscriptions" />
          <ExportCSVButton data={csvData} headers={csvHeaders} filename={`hq-subscriptions-${new Date().toISOString().substring(0,10)}.csv`} />
        </div>
      </div>

      {/* Plan summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {plans.map(plan => (
          <div key={plan} className="bg-white rounded-xl border border-gray-200 p-4">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[plan]}`}>{plan}</span>
            <p className="text-3xl font-bold text-gray-900 mt-2">{planTotals[plan] ?? 0}</p>
            <p className="text-xs text-gray-400">organisations</p>
          </div>
        ))}
      </div>

      {/* Branch × plan matrix */}
      {branchRows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">By Branch</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-5 py-3 text-left">Branch</th>
                  {plans.map(p => <th key={p} className="px-4 py-3 text-right capitalize">{p}</th>)}
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {branchRows.map(r => (
                  <tr key={r.branch} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{r.branch}</td>
                    {plans.map(p => (
                      <td key={p} className="px-4 py-3 text-right text-gray-600">
                        {(r as Record<string, number | string>)[p] ?? '—'}
                      </td>
                    ))}
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Organisation detail table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{rows.length} organisations</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Organisation</th>
                <th className="px-5 py-3 text-left">Branch</th>
                <th className="px-5 py-3 text-left">Plan</th>
                <th className="px-5 py-3 text-left">Sub Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!rows.length ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">No organisations found</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{r.org}</td>
                  <td className="px-5 py-3 text-gray-600">{r.branch}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PLAN_COLORS[r.plan] ?? 'bg-gray-100 text-gray-500'}`}>
                      {r.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{r.sub_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
