import { createClient } from '@/lib/supabase/server'
import OmrSymbol from '@/components/ui/OmrSymbol'
import RevenueCharts from './RevenueCharts'
import RevenueExportButtons from './RevenueExportButtons'
import Link from 'next/link'

type BillingRecord = {
  id: string
  branch_id: string
  month: string
  total_revenue_omr: number
  share_amount_omr: number
  license_fee_omr: number
  status: string
  branches: { display_name: string } | null
}

export default async function HQRevenueOverviewPage() {
  const supabase = await createClient()

  const { data: billing } = await supabase
    .from('branch_billing')
    .select(`
      id, branch_id, month, total_revenue_omr, share_amount_omr, license_fee_omr, status,
      branches!branch_billing_branch_id_fkey ( display_name )
    `)
    .order('month', { ascending: false })

  const rows = (billing ?? []) as unknown as BillingRecord[]

  // ── Per-branch P&L summary ────────────────────────────────────────────────
  const branchMap = new Map<string, {
    name: string
    totalRevenue: number
    totalShare: number
    totalLicense: number
    collected: number
    pending: number
    months: number
  }>()

  for (const r of rows) {
    const name = r.branches?.display_name ?? r.branch_id
    if (!branchMap.has(r.branch_id)) {
      branchMap.set(r.branch_id, { name, totalRevenue: 0, totalShare: 0, totalLicense: 0, collected: 0, pending: 0, months: 0 })
    }
    const b = branchMap.get(r.branch_id)!
    b.totalRevenue += Number(r.total_revenue_omr)
    b.totalShare   += Number(r.share_amount_omr)
    b.totalLicense += Number(r.license_fee_omr)
    b.months       += 1
    const due = Number(r.share_amount_omr) + Number(r.license_fee_omr)
    if (r.status === 'paid') b.collected += due
    else                     b.pending   += due
  }

  const branches = Array.from(branchMap.entries())
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)

  const grandTotalRevenue  = branches.reduce((s, b) => s + b.totalRevenue, 0)
  const grandTotalShare    = branches.reduce((s, b) => s + b.totalShare,   0)
  const grandTotalLicense  = branches.reduce((s, b) => s + b.totalLicense, 0)
  const grandCollected     = branches.reduce((s, b) => s + b.collected,    0)
  const grandPending       = branches.reduce((s, b) => s + b.pending,      0)

  // ── Monthly totals for chart ───────────────────────────────────────────────
  // Last 12 months, each branch as a series
  const monthSet = new Set(rows.map(r => r.month.slice(0, 7)))
  const months   = Array.from(monthSet).sort().slice(-12)

  const branchNames = branches.map(b => b.name)
  const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4']

  const chartData = months.map(m => {
    const point: Record<string, string | number> = {
      month: new Date(m + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    }
    for (const b of branches) {
      const rec = rows.find(r => r.branch_id === b.id && r.month.startsWith(m))
      point[b.name] = rec ? Number(rec.total_revenue_omr) : 0
    }
    return point
  })

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Overview</h1>
          <p className="text-sm text-gray-500">Cross-branch P&amp;L summary and revenue trends</p>
        </div>
        <RevenueExportButtons
          branches={branches}
          grandTotalRevenue={grandTotalRevenue}
          grandTotalShare={grandTotalShare}
          grandTotalLicense={grandTotalLicense}
          grandCollected={grandCollected}
          grandPending={grandPending}
          chartData={chartData}
        />
      </div>

      {/* Grand totals */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Total Revenue', value: grandTotalRevenue,  omr: true, color: 'amber'  },
          { label: 'HQ Share',      value: grandTotalShare,    omr: true, color: 'blue'   },
          { label: 'License Fees',  value: grandTotalLicense,  omr: true, color: 'purple' },
          { label: 'Collected',     value: grandCollected,     omr: true, color: 'green'  },
          { label: 'Pending',       value: grandPending,       omr: true, color: grandPending > 0 ? 'red' : 'gray' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`text-lg font-bold flex items-center gap-1 mb-0.5 ${
              color === 'amber'  ? 'text-amber-600'  :
              color === 'blue'   ? 'text-blue-600'   :
              color === 'purple' ? 'text-purple-600' :
              color === 'green'  ? 'text-green-600'  :
              color === 'red'    ? 'text-red-600'    : 'text-gray-700'
            }`}>
              <OmrSymbol size={15} variant="dark" /> {value.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Revenue trends chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue Trend — Last 12 Months</h2>
          <RevenueCharts data={chartData} branches={branchNames} colors={COLORS} />
        </div>
      )}

      {/* Per-branch P&L table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Branch P&amp;L Summary (All Time)</h2>
        </div>
        {branches.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">No billing data yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Branch</th>
                  <th className="px-5 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">Revenue <OmrSymbol variant="dark" size={12} /></span>
                  </th>
                  <th className="px-5 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">HQ Share <OmrSymbol variant="dark" size={12} /></span>
                  </th>
                  <th className="px-5 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">License <OmrSymbol variant="dark" size={12} /></span>
                  </th>
                  <th className="px-5 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">Collected <OmrSymbol variant="dark" size={12} /></span>
                  </th>
                  <th className="px-5 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">Pending <OmrSymbol variant="dark" size={12} /></span>
                  </th>
                  <th className="px-5 py-3 text-center">Months</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {branches.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <Link href={`/hq/branches/${b.id}`} className="hover:text-yellow-700 hover:underline">
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">{b.totalRevenue.toFixed(3)}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{b.totalShare.toFixed(3)}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{b.totalLicense.toFixed(3)}</td>
                    <td className="px-5 py-3 text-right text-green-600 font-medium">{b.collected.toFixed(3)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={b.pending > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                        {b.pending.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-gray-500">{b.months}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-gray-50 font-semibold text-gray-900">
                  <td className="px-5 py-3">Total</td>
                  <td className="px-5 py-3 text-right">{grandTotalRevenue.toFixed(3)}</td>
                  <td className="px-5 py-3 text-right">{grandTotalShare.toFixed(3)}</td>
                  <td className="px-5 py-3 text-right">{grandTotalLicense.toFixed(3)}</td>
                  <td className="px-5 py-3 text-right text-green-600">{grandCollected.toFixed(3)}</td>
                  <td className="px-5 py-3 text-right text-red-600">{grandPending.toFixed(3)}</td>
                  <td className="px-5 py-3 text-center text-gray-500">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
