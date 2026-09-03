import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { getMyBranchId } from '@/lib/admin-branch'
import OmrSymbol from '@/components/ui/OmrSymbol'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import YearSelector from './YearSelector'

export const metadata = { title: 'Branch P&L Report' }

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

export default async function AdminPnLPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = createAdminClient()
  const branchId = await getMyBranchId()
  if (!branchId) return <p className="p-6 text-gray-500">No branch linked to your account.</p>

  const year = parseInt(String(searchParams.year ?? new Date().getFullYear()), 10)
  const yearStart = `${year}-01-01`
  const today     = new Date().toISOString().split('T')[0]
  const isCurrentYear = year === new Date().getFullYear()
  const yearEnd   = isCurrentYear ? today : `${year + 1}-01-01`

  // ── Get all active orgs in this branch ──────────────────────────────────
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('branch_id', branchId)
    .is('canceled_at', null)
    .order('name')

  const orgIds = (orgs ?? []).map(o => o.id)

  if (!orgIds.length) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Branch P&amp;L Report</h1>
        <p className="text-gray-500">No active organizations in your branch yet.</p>
      </div>
    )
  }

  // ── Fetch data for all orgs in parallel ─────────────────────────────────
  const [
    { data: invoices },
    { data: expenses },
    { data: maintenance },
    { data: units },
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('amount, organization_id')
      .eq('status', 'paid')
      .or('currency.is.null,currency.eq.OMR')
      .gte('due_date', yearStart)
      .lte('due_date', yearEnd)
      .in('organization_id', orgIds),

    supabase
      .from('expenses')
      .select('amount, organization_id')
      .gte('date', yearStart)
      .lte('date', yearEnd)
      .in('organization_id', orgIds),

    supabase
      .from('maintenance_requests')
      .select('charge_amount, organization_id')
      .eq('charge_payer', 'owner')
      .not('charge_amount', 'is', null)
      .gte('completed_at', yearStart)
      .lte('completed_at', yearEnd)
      .in('organization_id', orgIds),

    supabase
      .from('units')
      .select('id, status, organization_id')
      .in('organization_id', orgIds),
  ])

  // ── Aggregate per org ────────────────────────────────────────────────────
  type OrgStats = { revenue: number; expenses: number; maintenance: number; units: number; occupied: number }
  const stats: Record<string, OrgStats> = {}
  ;(orgs ?? []).forEach(o => { stats[o.id] = { revenue: 0, expenses: 0, maintenance: 0, units: 0, occupied: 0 } })

  ;(invoices ?? []).forEach(i => {
    if (stats[i.organization_id]) stats[i.organization_id].revenue += Number(i.amount ?? 0)
  })
  ;(expenses ?? []).forEach(e => {
    if (stats[e.organization_id]) stats[e.organization_id].expenses += Number(e.amount ?? 0)
  })
  ;(maintenance ?? []).forEach(m => {
    if (stats[m.organization_id]) stats[m.organization_id].maintenance += Number(m.charge_amount ?? 0)
  })
  ;(units ?? []).forEach(u => {
    if (stats[u.organization_id]) {
      stats[u.organization_id].units++
      if (u.status === 'occupied') stats[u.organization_id].occupied++
    }
  })

  // ── Branch totals ────────────────────────────────────────────────────────
  let totRev = 0, totExp = 0, totUnits = 0, totOccupied = 0
  Object.values(stats).forEach(s => {
    totRev  += s.revenue
    totExp  += s.expenses + s.maintenance
    totUnits    += s.units
    totOccupied += s.occupied
  })
  const totNet = totRev - totExp
  const periodLabel = isCurrentYear
    ? `${yearStart} to ${today}`
    : `${yearStart} to ${year}-12-31`

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch P&amp;L Report</h1>
          <p className="text-sm text-gray-500">All owners in your branch · {periodLabel} · OMR only</p>
        </div>
        <Suspense>
          <YearSelector year={year} />
        </Suspense>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue',  value: totRev,  color: 'text-yellow-700', bg: 'bg-yellow-50' },
          { label: 'Total Expenses', value: totExp,  color: 'text-red-600',    bg: 'bg-red-50'    },
          { label: 'Net Income',     value: totNet,  color: totNet >= 0 ? 'text-green-700' : 'text-red-600', bg: totNet >= 0 ? 'bg-green-50' : 'bg-red-50' },
          { label: 'Occupancy',      value: totUnits > 0 ? (totOccupied / totUnits) * 100 : 0, color: 'text-blue-700', bg: 'bg-blue-50', isPercent: true },
        ].map(c => (
          <div key={c.label} className={`${c.bg} rounded-xl border border-gray-200 p-4`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color} flex items-center gap-1`}>
              {(c as any).isPercent
                ? `${Math.round((c as any).value)}%`
                : <><OmrSymbol variant="dark" size={18} />{fmt(c.value)}</>
              }
            </p>
            {!(c as any).isPercent && (
              <p className="text-xs text-gray-400 mt-1">{totUnits > 0 ? `${totOccupied}/${totUnits} units` : ''}</p>
            )}
          </div>
        ))}
      </div>

      {/* Per-owner table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Per-Owner Breakdown</h2>
          <p className="text-xs text-gray-400 mt-0.5">Revenue = paid OMR invoices by due date · Expenses = recorded + owner-paid maintenance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Owner / Org</th>
                <th className="px-5 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">Revenue <OmrSymbol variant="dark" size={12} /></span>
                </th>
                <th className="px-5 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">Expenses <OmrSymbol variant="dark" size={12} /></span>
                </th>
                <th className="px-5 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">Net Income <OmrSymbol variant="dark" size={12} /></span>
                </th>
                <th className="px-5 py-3 text-right">Occupancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(orgs ?? []).map(org => {
                const s   = stats[org.id] ?? { revenue: 0, expenses: 0, maintenance: 0, units: 0, occupied: 0 }
                const exp = s.expenses + s.maintenance
                const net = s.revenue - exp
                const occ = s.units > 0 ? Math.round((s.occupied / s.units) * 100) : 0
                return (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{org.name}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{fmt(s.revenue)}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{fmt(exp)}</td>
                    <td className="px-5 py-3 text-right"><NetBadge net={net} /></td>
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
            {(orgs ?? []).length > 1 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-gray-800">
                  <td className="px-5 py-3">Branch Total</td>
                  <td className="px-5 py-3 text-right">{fmt(totRev)}</td>
                  <td className="px-5 py-3 text-right">{fmt(totExp)}</td>
                  <td className="px-5 py-3 text-right"><NetBadge net={totNet} /></td>
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
    </div>
  )
}
