import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import OmrSymbol from '@/components/ui/OmrSymbol'
import ExportPnLButton from './ExportPnLButton'
import YearSelector from './YearSelector'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function fmt(n: number) { return n.toFixed(3) }

function NetBadge({ net }: { net: number }) {
  if (net > 0) return (
    <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
      <TrendingUp className="w-3.5 h-3.5" />{fmt(net)}
    </span>
  )
  if (net < 0) return (
    <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
      <TrendingDown className="w-3.5 h-3.5" />{fmt(net)}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-gray-400">
      <Minus className="w-3.5 h-3.5" />{fmt(net)}
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
    // ── Revenue: paid OMR invoices by due_date (active orgs only) ──────────
    activeOrgIds.length
      ? supabase
          .from('invoices')
          .select('amount, organization_id')
          .eq('status', 'paid')
          .or('currency.is.null,currency.eq.OMR')
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
    supabase.from('branches').select('id, display_name, status').order('display_name'),

    // ── Units for occupancy (active orgs only) ───────────────────────────────
    activeOrgIds.length
      ? supabase.from('units').select('id, status, organization_id').in('organization_id', activeOrgIds)
      : Promise.resolve({ data: [] }),
  ])

  // ── Aggregate per branch ─────────────────────────────────────────────────
  type BranchStats = {
    revenue: number
    expenses: number
    maintenance: number
    share: number
    license: number
    units: number
    occupied: number
  }

  const stats: Record<string, BranchStats> = {}
  ;(branches ?? []).forEach(b => {
    stats[b.id] = { revenue: 0, expenses: 0, maintenance: 0, share: 0, license: 0, units: 0, occupied: 0 }
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

  // ── Platform totals ──────────────────────────────────────────────────────
  let totRev = 0, totExp = 0, totMaint = 0, totShare = 0, totLicense = 0
  let totUnits = 0, totOccupied = 0
  Object.values(stats).forEach(s => {
    totRev     += s.revenue
    totExp     += s.expenses + s.maintenance
    totShare   += s.share
    totLicense += s.license
    totUnits   += s.units
    totOccupied+= s.occupied
  })
  const totNet = totRev - totExp

  // ── Excel export data ────────────────────────────────────────────────────
  const excelRows = (branches ?? []).map(b => {
    const s   = stats[b.id] ?? { revenue: 0, expenses: 0, maintenance: 0, share: 0, license: 0, units: 0, occupied: 0 }
    const exp = s.expenses + s.maintenance
    const occ = s.units > 0 ? Math.round((s.occupied / s.units) * 100) : 0
    return {
      branch: b.display_name,
      status: b.status,
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
    totRevenue: totRev,
    totExpenses: totExp,
    totNet,
    totShare,
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

      {/* Platform summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Revenue',  value: totRev,     color: 'text-yellow-700', bg: 'bg-yellow-50'  },
          { label: 'Total Expenses', value: totExp,     color: 'text-red-600',   bg: 'bg-red-50'     },
          { label: 'Net Income',     value: totNet,     color: totNet >= 0 ? 'text-green-700' : 'text-red-600', bg: totNet >= 0 ? 'bg-green-50' : 'bg-red-50' },
          { label: 'HQ Share',       value: totShare,   color: 'text-blue-700',  bg: 'bg-blue-50'    },
          { label: 'License Fees',   value: totLicense, color: 'text-purple-700', bg: 'bg-purple-50'  },
        ].map(c => (
          <div key={c.label} className={`${c.bg} rounded-xl border border-gray-200 p-4`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color} flex items-center gap-1`}>
              <OmrSymbol variant="dark" size={18} />
              {fmt(c.value)}
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
                <th className="px-5 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">Revenue <OmrSymbol variant="dark" size={12} /></span>
                </th>
                <th className="px-5 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">Expenses <OmrSymbol variant="dark" size={12} /></span>
                </th>
                <th className="px-5 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">Net Income <OmrSymbol variant="dark" size={12} /></span>
                </th>
                <th className="px-5 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">HQ Share <OmrSymbol variant="dark" size={12} /></span>
                </th>
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
                const s   = stats[b.id] ?? { revenue: 0, expenses: 0, maintenance: 0, share: 0, license: 0, units: 0, occupied: 0 }
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
                    <td className="px-5 py-3 text-right text-gray-700">{fmt(s.revenue)}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{fmt(exp)}</td>
                    <td className="px-5 py-3 text-right"><NetBadge net={net} /></td>
                    <td className="px-5 py-3 text-right text-blue-700 font-medium">{fmt(s.share)}</td>
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
            {/* Totals row */}
            {(branches ?? []).length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-gray-800">
                  <td className="px-5 py-3">Platform Total</td>
                  <td className="px-5 py-3 text-right">{fmt(totRev)}</td>
                  <td className="px-5 py-3 text-right">{fmt(totExp)}</td>
                  <td className="px-5 py-3 text-right"><NetBadge net={totNet} /></td>
                  <td className="px-5 py-3 text-right text-blue-700">{fmt(totShare)}</td>
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
        Revenue = paid OMR invoices by due date · Expenses = recorded expenses + owner-paid maintenance charges · HQ Share from billing records
      </p>
    </div>
  )
}
