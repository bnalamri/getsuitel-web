import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import OmrSymbol from '@/components/ui/OmrSymbol'
import CurrencyAmount from '@/components/CurrencyAmount'
import ExportPnLButton from './ExportPnLButton'
import YearSelector from './YearSelector'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function fmt(n: number) { return n.toFixed(3) }

function NetBadge({ net, currency }: { net: number; currency: string }) {
  const color = net > 0 ? 'text-green-700' : net < 0 ? 'text-red-600' : 'text-gray-400'
  const Icon  = net > 0 ? TrendingUp : net < 0 ? TrendingDown : Minus
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${color}`}>
      <Icon className="w-3.5 h-3.5" /><CurrencyAmount value={net} currency={currency} />
    </span>
  )
}

export default async function HQPnLPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = createAdminClient()
  const year = parseInt(String(searchParams.year ?? new Date().getFullYear()), 10)
  const yearStart = `${year}-01-01`
  const today     = new Date().toISOString().split('T')[0]
  const isCurrentYear = year === new Date().getFullYear()
  // Cap at today for current year so HQ matches branch YTD view
  const yearEnd   = isCurrentYear ? today : `${year + 1}-01-01`

  // ── Step 1: get only active (non-canceled) org IDs per branch ────────────
  const { data: activeOrgs } = await supabase
    .from('organizations')
    .select('id, branch_id')
    .is('canceled_at', null)

  const activeOrgIds = (activeOrgs ?? []).map(o => o.id)
  // Map orgId → branchId for fast lookups
  const orgBranch: Record<string, string> = {}
  ;(activeOrgs ?? []).forEach(o => { if (o.branch_id) orgBranch[o.id] = o.branch_id })

  const [
    { data: invoices },
    { data: expenses },
    { data: maintenance },
    { data: billing },
    { data: branches },
    { data: units },
  ] = await Promise.all([
    // ── Revenue: paid invoices by due_date (active orgs only). Not filtered
    // by currency — each org's invoices are already denominated in its own
    // branch's currency (see 20260915l_branch_currency.sql), so summing them
    // per branch below stays single-currency without needing a row-level check.
    activeOrgIds.length
      ? supabase
          .from('invoices')
          .select('amount, organization_id')
          .eq('status', 'paid')
          .gte('due_date', yearStart)
          .lte('due_date', yearEnd)
          .in('organization_id', activeOrgIds)
      : Promise.resolve({ data: [] }),

    // ── Expenses: by date (active orgs only) ────────────────────────────────
    activeOrgIds.length
      ? supabase
          .from('expenses')
          .select('amount, organization_id')
          .gte('date', yearStart)
          .lte('date', yearEnd)
          .in('organization_id', activeOrgIds)
      : Promise.resolve({ data: [] }),

    // ── Maintenance billed to owner (active orgs only) ──────────────────────
    activeOrgIds.length
      ? supabase
          .from('maintenance_requests')
          .select('charge_amount, organization_id')
          .eq('charge_payer', 'owner')
          .not('charge_amount', 'is', null)
          .gte('completed_at', yearStart)
          .lte('completed_at', yearEnd)
          .in('organization_id', activeOrgIds)
      : Promise.resolve({ data: [] }),

    // ── HQ share + license fee (from branch_billing, year-filtered) ─────────
    supabase
      .from('branch_billing')
      .select('branch_id, share_amount_omr, license_fee_omr')
      .gte('month', yearStart)
      .lte('month', yearEnd),

    // ── Branch list ─────────────────────────────────────────────────────────
    supabase.from('branches').select('id, display_name, status, currency').order('display_name'),

    // ── Units for occupancy (active orgs only) ───────────────────────────────
    activeOrgIds.length
      ? supabase.from('units').select('id, status, organization_id').in('organization_id', activeOrgIds)
      : Promise.resolve({ data: [] }),
  ])

  // ── Aggregate per branch ─────────────────────────────────────────────────
  // Never blend currencies (see 20260915l_branch_currency.sql): revenue,
  // expenses, and share all travel in the branch's own currency. Only
  // license_fee_omr is a flat HQ-set OMR fee, safe to sum across branches.
  type BranchStats = {
    revenue: number
    expenses: number
    maintenance: number
    share: number
    license: number
    units: number
    occupied: number
    currency: string
  }

  const stats: Record<string, BranchStats> = {}
  ;(branches ?? []).forEach(b => {
    stats[b.id] = { revenue: 0, expenses: 0, maintenance: 0, share: 0, license: 0, units: 0, occupied: 0, currency: b.currency || 'OMR' }
  })

  ;(invoices ?? []).forEach(inv => {
    const bid = orgBranch[(inv as any).organization_id]
    if (bid && stats[bid]) stats[bid].revenue += Number(inv.amount ?? 0)
  })

  ;(expenses ?? []).forEach(e => {
    const bid = orgBranch[(e as any).organization_id]
    if (bid && stats[bid]) stats[bid].expenses += Number(e.amount ?? 0)
  })

  ;(maintenance ?? []).forEach(m => {
    const bid = orgBranch[(m as any).organization_id]
    if (bid && stats[bid]) stats[bid].maintenance += Number(m.charge_amount ?? 0)
  })

  ;(billing ?? []).forEach(r => {
    if (!stats[r.branch_id]) return
    stats[r.branch_id].share   += Number(r.share_amount_omr ?? 0)
    stats[r.branch_id].license += Number(r.license_fee_omr ?? 0)
  })

  ;(units ?? []).forEach(u => {
    const bid = orgBranch[(u as any).organization_id]
    if (bid && stats[bid]) {
      stats[bid].units++
      if (u.status === 'occupied') stats[bid].occupied++
    }
  })

  // ── Platform totals — grouped by currency, never blended ─────────────────
  const revenueByCurrency: Record<string, number> = {}
  const expensesByCurrency: Record<string, number> = {}
  const shareByCurrency: Record<string, number> = {}
  let totLicense = 0, totUnits = 0, totOccupied = 0
  Object.values(stats).forEach(s => {
    const c = s.currency
    revenueByCurrency[c]  = (revenueByCurrency[c] ?? 0) + s.revenue
    expensesByCurrency[c] = (expensesByCurrency[c] ?? 0) + s.expenses + s.maintenance
    shareByCurrency[c]    = (shareByCurrency[c] ?? 0) + s.share
    totLicense  += s.license
    totUnits    += s.units
    totOccupied += s.occupied
  })
  const currencies = Array.from(new Set([
    ...Object.keys(revenueByCurrency), ...Object.keys(expensesByCurrency), ...Object.keys(shareByCurrency),
  ])).sort((a, b) => (revenueByCurrency[b] ?? 0) - (revenueByCurrency[a] ?? 0))
  const netByCurrency: Record<string, number> = {}
  currencies.forEach(c => { netByCurrency[c] = (revenueByCurrency[c] ?? 0) - (expensesByCurrency[c] ?? 0) })

  // ── Excel export data ────────────────────────────────────────────────────
  const excelRows = (branches ?? []).map(b => {
    const s   = stats[b.id] ?? { revenue: 0, expenses: 0, maintenance: 0, share: 0, license: 0, units: 0, occupied: 0, currency: 'OMR' }
    const exp = s.expenses + s.maintenance
    const occ = s.units > 0 ? Math.round((s.occupied / s.units) * 100) : 0
    return {
      branch: b.display_name,
      status: b.status,
      currency: s.currency,
      revenue: s.revenue,
      expenses: exp,
      net: s.revenue - exp,
      hqShare: s.share,
      licenseFee: s.license,
      units: s.units,
      occupancy: occ,
    }
  })
  const excelSummary = {
    byCurrency: currencies.map(c => ({
      currency: c,
      revenue: revenueByCurrency[c] ?? 0,
      expenses: expensesByCurrency[c] ?? 0,
      net: netByCurrency[c] ?? 0,
      share: shareByCurrency[c] ?? 0,
    })),
    totLicense,
    totUnits,
    totOccupied,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cross-Branch P&amp;L</h1>
          <p className="text-sm text-gray-500">
            Paid invoices by due date · recorded expenses — {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <YearSelector year={year} />
          </Suspense>
          <ExportPnLButton rows={excelRows} summary={excelSummary} />
        </div>
      </div>

      {/* Platform summary cards — grouped by currency, never blended (see 20260915l_branch_currency.sql) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {currencies.flatMap(c => [
          { label: `Total Revenue (${c})`,  value: revenueByCurrency[c] ?? 0,  currency: c, color: 'text-yellow-700', bg: 'bg-yellow-50'  },
          { label: `Total Expenses (${c})`, value: expensesByCurrency[c] ?? 0, currency: c, color: 'text-red-600',   bg: 'bg-red-50'     },
          { label: `Net Income (${c})`,     value: netByCurrency[c] ?? 0,      currency: c, color: (netByCurrency[c] ?? 0) >= 0 ? 'text-green-700' : 'text-red-600', bg: (netByCurrency[c] ?? 0) >= 0 ? 'bg-green-50' : 'bg-red-50' },
          { label: `HQ Share (${c})`,       value: shareByCurrency[c] ?? 0,    currency: c, color: 'text-blue-700',  bg: 'bg-blue-50'    },
        ]).concat([
          { label: 'License Fees (OMR)', value: totLicense, currency: 'OMR', color: 'text-purple-700', bg: 'bg-purple-50' },
        ]).map((c, i) => (
          <div key={`${c.label}-${i}`} className={`${c.bg} rounded-xl border border-gray-200 p-4`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color} flex items-center gap-1`}>
              <CurrencyAmount value={c.value} currency={c.currency} />
            </p>
          </div>
        ))}
      </div>

      {/* Occupancy summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Platform Occupancy</span>
          <span className="text-sm font-bold text-green-700">
            {totUnits > 0 ? Math.round((totOccupied / totUnits) * 100) : 0}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full"
            style={{ width: totUnits > 0 ? `${(totOccupied / totUnits) * 100}%` : '0%' }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{totOccupied} of {totUnits} units occupied across all branches</p>
      </div>

      {/* Per-branch table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Per-Branch Breakdown</h2>
          <span className="text-xs text-gray-400">Revenue from invoices · Expenses include maintenance (owner-paid)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Branch</th>
                {/* Revenue/Expenses/Net/Share vary by the branch's own currency — no fixed OMR icon in the header */}
                <th className="px-5 py-3 text-right">Revenue</th>
                <th className="px-5 py-3 text-right">Expenses</th>
                <th className="px-5 py-3 text-right">Net Income</th>
                <th className="px-5 py-3 text-right">HQ Share</th>
                <th className="px-5 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">License Fee <OmrSymbol variant="dark" size={12} /></span>
                </th>
                <th className="px-5 py-3 text-right">Occupancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!(branches ?? []).length ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">No branches found</td></tr>
              ) : (branches ?? []).map(b => {
                const s   = stats[b.id] ?? { revenue: 0, expenses: 0, maintenance: 0, share: 0, license: 0, units: 0, occupied: 0, currency: 'OMR' }
                const exp = s.expenses + s.maintenance
                const net = s.revenue - exp
                const occ = s.units > 0 ? Math.round((s.occupied / s.units) * 100) : 0
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {b.display_name}
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${
                        b.status === 'active'    ? 'bg-green-100 text-green-700'  :
                        b.status === 'suspended' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{b.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700"><CurrencyAmount value={s.revenue} currency={s.currency} /></td>
                    <td className="px-5 py-3 text-right text-gray-700"><CurrencyAmount value={exp} currency={s.currency} /></td>
                    <td className="px-5 py-3 text-right"><NetBadge net={net} currency={s.currency} /></td>
                    <td className="px-5 py-3 text-right text-blue-700 font-medium"><CurrencyAmount value={s.share} currency={s.currency} /></td>
                    <td className="px-5 py-3 text-right text-purple-700 font-medium">{fmt(s.license)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${occ >= 75 ? 'bg-green-500' : occ >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${occ}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-8 text-right">{occ}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Totals row — Revenue/Expenses/Net/Share are per-currency (see summary cards above);
                a single blended figure here would be exactly the bug this page was fixed for. */}
            {(branches ?? []).length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-gray-800">
                  <td className="px-5 py-3">Platform Total</td>
                  <td className="px-5 py-3 text-right text-xs text-gray-400" colSpan={4}>see per-currency totals above</td>
                  <td className="px-5 py-3 text-right text-purple-700">{fmt(totLicense)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs font-medium text-gray-600">
                      {totUnits > 0 ? Math.round((totOccupied / totUnits) * 100) : 0}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Data note */}
      <p className="text-xs text-gray-400">
        Revenue = paid invoices by due date, in each branch&apos;s own currency · Expenses = recorded expenses + owner-paid maintenance charges (same currency) · HQ Share from billing records · License Fees are always OMR
      </p>
    </div>
  )
}
