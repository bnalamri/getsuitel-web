import { createClient } from '@/lib/supabase/server'
import OmrSymbol from '@/components/ui/OmrSymbol'
import CurrencyAmount from '@/components/CurrencyAmount'
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
  currency: string | null
  status: string
  created_at: string
  branches: { display_name: string } | null
}

export default async function HQRevenueOverviewPage() {
  const supabase = await createClient()

  const { data: billing } = await supabase
    .from('branch_billing')
    .select(`
      id, branch_id, month, total_revenue_omr, share_amount_omr, license_fee_omr, currency, status, created_at,
      branches!branch_billing_branch_id_fkey ( display_name )
    `)
    .order('month', { ascending: false })

  const rows = (billing ?? []) as unknown as BillingRecord[]

  // Same 7-day overdue threshold used by the license-reminder cron and Alert Center
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // ── Per-branch P&L summary ────────────────────────────────────────────────
  // A branch's revenue/share travel in its own currency (see
  // 20260915l_branch_currency.sql); license_fee_omr is always a flat OMR fee.
  // So even within one branch, "collected"/"pending"/"overdue" can't just be
  // share + license added together unless that branch's currency is OMR —
  // they're tracked as separate share/license components below and only
  // combined into one number where doing so is actually valid.
  const branchMap = new Map<string, {
    name: string
    currency: string
    totalRevenue: number
    totalShare: number
    totalLicense: number
    shareCollected: number
    sharePending: number
    shareOverdue: number
    licenseCollected: number
    licensePending: number
    licenseOverdue: number
  }>()

  for (const r of rows) {
    const name = r.branches?.display_name ?? r.branch_id
    const currency = r.currency || 'OMR'
    if (!branchMap.has(r.branch_id)) {
      branchMap.set(r.branch_id, {
        name, currency, totalRevenue: 0, totalShare: 0, totalLicense: 0,
        shareCollected: 0, sharePending: 0, shareOverdue: 0,
        licenseCollected: 0, licensePending: 0, licenseOverdue: 0,
      })
    }
    const b = branchMap.get(r.branch_id)!
    b.totalRevenue += Number(r.total_revenue_omr)
    b.totalShare   += Number(r.share_amount_omr)
    b.totalLicense += Number(r.license_fee_omr)
    const share   = Number(r.share_amount_omr)
    const license = Number(r.license_fee_omr)
    if (r.status === 'paid') {
      b.shareCollected   += share
      b.licenseCollected += license
    } else {
      b.sharePending   += share
      b.licensePending += license
      if (new Date(r.created_at) < sevenDaysAgo) {
        b.shareOverdue   += share
        b.licenseOverdue += license
      }
    }
  }

  const branches = Array.from(branchMap.entries())
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)

  // Grand totals: license fee is always OMR so it's safe to sum across every
  // branch; revenue/share must be grouped by currency instead of blended.
  const grandTotalLicense = branches.reduce((s, b) => s + b.totalLicense, 0)
  const grandLicenseCollected = branches.reduce((s, b) => s + b.licenseCollected, 0)
  const grandLicensePending   = branches.reduce((s, b) => s + b.licensePending,   0)
  const grandLicenseOverdue   = branches.reduce((s, b) => s + b.licenseOverdue,   0)

  const revenueByCurrency: Record<string, number> = {}
  const shareByCurrency: Record<string, number> = {}
  const shareCollectedByCurrency: Record<string, number> = {}
  const sharePendingByCurrency: Record<string, number> = {}
  const shareOverdueByCurrency: Record<string, number> = {}
  for (const b of branches) {
    revenueByCurrency[b.currency]        = (revenueByCurrency[b.currency] ?? 0) + b.totalRevenue
    shareByCurrency[b.currency]          = (shareByCurrency[b.currency] ?? 0) + b.totalShare
    shareCollectedByCurrency[b.currency] = (shareCollectedByCurrency[b.currency] ?? 0) + b.shareCollected
    sharePendingByCurrency[b.currency]   = (sharePendingByCurrency[b.currency] ?? 0) + b.sharePending
    shareOverdueByCurrency[b.currency]   = (shareOverdueByCurrency[b.currency] ?? 0) + b.shareOverdue
  }

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
          grandTotalLicense={grandTotalLicense}
          grandLicenseCollected={grandLicenseCollected}
          grandLicensePending={grandLicensePending}
          grandLicenseOverdue={grandLicenseOverdue}
          revenueByCurrency={revenueByCurrency}
          shareByCurrency={shareByCurrency}
          shareCollectedByCurrency={shareCollectedByCurrency}
          sharePendingByCurrency={sharePendingByCurrency}
          shareOverdueByCurrency={shareOverdueByCurrency}
          chartData={chartData}
        />
      </div>

      {/* Grand totals — license fee is always OMR (safe to blend across
          branches); revenue/HQ share/collection status are broken out per
          currency instead, since branches now bill in their own currency. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(revenueByCurrency).map(([c, v]) => (
          <div key={`rev-${c}`} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-lg font-bold text-amber-600 mb-0.5"><CurrencyAmount value={v} currency={c} /></div>
            <div className="text-xs text-gray-500">Total Revenue ({c})</div>
          </div>
        ))}
        {Object.entries(shareByCurrency).map(([c, v]) => (
          <div key={`share-${c}`} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-lg font-bold text-blue-600 mb-0.5"><CurrencyAmount value={v} currency={c} /></div>
            <div className="text-xs text-gray-500">HQ Share ({c})</div>
          </div>
        ))}
        {[
          { label: 'License Fees',       value: grandTotalLicense,     color: 'purple' },
          { label: 'License Collected',  value: grandLicenseCollected, color: 'green'  },
          { label: 'License Pending',    value: grandLicensePending,   color: grandLicensePending > 0 ? 'red' : 'gray' },
          { label: 'License Overdue (7d+)', value: grandLicenseOverdue, color: grandLicenseOverdue > 0 ? 'red' : 'gray' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`text-lg font-bold flex items-center gap-1 mb-0.5 ${
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
          <h2 className="font-semibold text-gray-900 mb-1">Revenue Trend — Last 12 Months</h2>
          <p className="text-xs text-gray-400 mb-4">Each branch plotted in its own currency — values aren&apos;t directly comparable across branches with different currencies.</p>
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
                  <th className="px-5 py-3 text-right">Revenue</th>
                  <th className="px-5 py-3 text-right">HQ Share</th>
                  <th className="px-5 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">License <OmrSymbol variant="dark" size={12} /></span>
                  </th>
                  <th className="px-5 py-3 text-right">Share Collected</th>
                  <th className="px-5 py-3 text-right">Share Pending</th>
                  <th className="px-5 py-3 text-right" title="Pending amount unpaid for 7+ days since billing">Share Overdue</th>
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
                    <td className="px-5 py-3 text-right text-gray-700"><CurrencyAmount value={b.totalRevenue} currency={b.currency} /></td>
                    <td className="px-5 py-3 text-right text-gray-700"><CurrencyAmount value={b.totalShare} currency={b.currency} /></td>
                    <td className="px-5 py-3 text-right text-gray-700"><CurrencyAmount value={b.totalLicense} currency="OMR" /></td>
                    <td className="px-5 py-3 text-right text-green-600 font-medium"><CurrencyAmount value={b.shareCollected} currency={b.currency} /></td>
                    <td className="px-5 py-3 text-right">
                      <span className={b.sharePending > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                        <CurrencyAmount value={b.sharePending} currency={b.currency} />
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={b.shareOverdue > 0 ? 'text-red-700 font-semibold' : 'text-gray-300'}>
                        {b.shareOverdue > 0 ? <CurrencyAmount value={b.shareOverdue} currency={b.currency} /> : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Per-currency totals rows */}
                {Object.entries(revenueByCurrency).map(([c, v]) => (
                  <tr key={`total-${c}`} className="bg-gray-50 font-semibold text-gray-900">
                    <td className="px-5 py-3">Total ({c})</td>
                    <td className="px-5 py-3 text-right"><CurrencyAmount value={v} currency={c} /></td>
                    <td className="px-5 py-3 text-right"><CurrencyAmount value={shareByCurrency[c] ?? 0} currency={c} /></td>
                    <td className="px-5 py-3 text-right text-gray-300">—</td>
                    <td className="px-5 py-3 text-right text-green-600"><CurrencyAmount value={shareCollectedByCurrency[c] ?? 0} currency={c} /></td>
                    <td className="px-5 py-3 text-right text-red-600"><CurrencyAmount value={sharePendingByCurrency[c] ?? 0} currency={c} /></td>
                    <td className="px-5 py-3 text-right text-red-700"><CurrencyAmount value={shareOverdueByCurrency[c] ?? 0} currency={c} /></td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold text-gray-900">
                  <td className="px-5 py-3">Total License Fee (OMR)</td>
                  <td className="px-5 py-3"></td>
                  <td className="px-5 py-3"></td>
                  <td className="px-5 py-3 text-right"><CurrencyAmount value={grandTotalLicense} currency="OMR" /></td>
                  <td className="px-5 py-3 text-right text-green-600"><CurrencyAmount value={grandLicenseCollected} currency="OMR" /></td>
                  <td className="px-5 py-3 text-right text-red-600"><CurrencyAmount value={grandLicensePending} currency="OMR" /></td>
                  <td className="px-5 py-3 text-right text-red-700"><CurrencyAmount value={grandLicenseOverdue} currency="OMR" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
