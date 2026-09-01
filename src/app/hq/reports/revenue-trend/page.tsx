import { createAdminClient } from '@/lib/supabase/server'
import OmrSymbol from '@/components/ui/OmrSymbol'
import ExportCSVButton from '../_components/ExportCSVButton'

function MonthLabel(m: string) {
  return new Date(m).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

export default async function HQRevenueTrendPage() {
  const supabase = createAdminClient()

  // Last 12 months of billing data
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const fromDate = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth(), 1)
    .toISOString().substring(0, 10)

  const [{ data: billing }, { data: branches }] = await Promise.all([
    supabase
      .from('branch_billing')
      .select('branch_id, month, total_revenue_omr, share_amount_omr, license_fee_omr, status, branches ( display_name )')
      .gte('month', fromDate)
      .order('month', { ascending: false }),
    supabase.from('branches').select('id, display_name').order('display_name'),
  ])

  // Build month list (last 12)
  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    months.push(d.toISOString().substring(0, 10))
  }

  // Aggregate: totals per month across all branches
  const monthTotals: Record<string, { revenue: number; share: number; license: number }> = {}
  months.forEach(m => { monthTotals[m] = { revenue: 0, share: 0, license: 0 } })

  // Per-branch monthly data
  type BranchMonthMap = Record<string, Record<string, number>> // branchId → month → revenue
  const branchRevenue: BranchMonthMap = {}

  ;(billing ?? []).forEach(r => {
    const month = r.month.substring(0, 10)
    if (monthTotals[month]) {
      monthTotals[month].revenue += Number(r.total_revenue_omr)
      monthTotals[month].share   += Number(r.share_amount_omr)
      monthTotals[month].license += Number(r.license_fee_omr)
    }
    if (!branchRevenue[r.branch_id]) branchRevenue[r.branch_id] = {}
    branchRevenue[r.branch_id][month] = (branchRevenue[r.branch_id][month] ?? 0) + Number(r.total_revenue_omr)
  })

  const maxRevenue = Math.max(...months.map(m => monthTotals[m].revenue), 1)

  // CSV: one row per branch per month
  const csvData = (billing ?? []).map(r => ({
    branch:  (r.branches as { display_name: string } | null)?.display_name ?? '—',
    month:   MonthLabel(r.month),
    revenue: Number(r.total_revenue_omr).toFixed(3),
    share:   Number(r.share_amount_omr).toFixed(3),
    license: Number(r.license_fee_omr).toFixed(3),
    status:  r.status,
  }))
  const csvHeaders = ['Branch', 'Month', 'Revenue (OMR)', 'HQ Share (OMR)', 'License Fee (OMR)', 'Status']

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Trend</h1>
          <p className="text-sm text-gray-500">Monthly revenue per branch — last 12 months</p>
        </div>
        <ExportCSVButton data={csvData} headers={csvHeaders} filename={`hq-revenue-trend-${new Date().toISOString().substring(0,10)}.csv`} />
      </div>

      {/* Monthly totals chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-800">Platform Monthly Revenue</h2>
          <span className="flex items-center gap-1 text-xs text-gray-400">All branches · <OmrSymbol variant="dark" size={13} /></span>
        </div>
        <div className="space-y-3">
          {months.slice().reverse().map(m => {
            const t   = monthTotals[m]
            const pct = maxRevenue > 0 ? (t.revenue / maxRevenue) * 100 : 0
            return (
              <div key={m} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0 text-right">{MonthLabel(m)}</span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-yellow-400 transition-all"
                    style={{ width: `${pct}%`, minWidth: pct > 0 ? 4 : 0 }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-24 flex-shrink-0">
                  {t.revenue.toFixed(3)}
                </span>
                <span className={`text-xs w-16 flex-shrink-0 ${t.revenue > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                  {t.revenue > 0 ? `↑ ${t.share.toFixed(0)} share` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-branch breakdown table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Per-Branch Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Branch</th>
                <th className="px-5 py-3 text-left">Month</th>
                <th className="px-5 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">Revenue <OmrSymbol variant="dark" size={13} /></span>
                </th>
                <th className="px-5 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">HQ Share <OmrSymbol variant="dark" size={13} /></span>
                </th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!(billing ?? []).length ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No billing records in last 12 months</td></tr>
              ) : (billing ?? []).map(r => (
                <tr key={`${r.branch_id}-${r.month}`} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {(r.branches as { display_name: string } | null)?.display_name ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{MonthLabel(r.month)}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{Number(r.total_revenue_omr).toFixed(3)}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{Number(r.share_amount_omr).toFixed(3)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
