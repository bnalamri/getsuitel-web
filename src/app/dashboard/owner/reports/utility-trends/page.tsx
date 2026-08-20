import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Zap, Building2, TrendingUp, Users } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'
import PropertySelectClient from '@/components/PropertySelectClient'
import UtilityTrendsExcelButton from './ExcelExportButton'
import OmrAmount from '@/components/OmrAmount'

export const metadata = { title: 'Utility Statistics & Trends' }
export const dynamic = 'force-dynamic'

const TYPE_COLOR: Record<string, string> = {
  water:       'bg-blue-400',
  electricity: 'bg-amber-400',
  internet:    'bg-violet-400',
}
const TYPE_LABEL: Record<string, string> = {
  water:       'Water',
  electricity: 'Electricity',
  internet:    'Internet',
}
const STATUS_COLOR: Record<string, string> = {
  paid:     'bg-emerald-400',
  invoiced: 'bg-blue-400',
  pending:  'bg-amber-400',
}

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

function fmtAmt(n: number, currency = 'OMR') {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}

export default async function UtilityTrendsPage({ searchParams }: { searchParams: Promise<{ property_id?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id, full_name').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return null
  const userName = (profile?.full_name as string) || user.email || ''

  const admin = createAdminClient()
  const today = new Date()
  const printDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const sp = await searchParams
  const propertyId = sp?.property_id ?? ''

  const [billsRes, orgRes, propertiesRes] = await Promise.all([
    admin.from('utility_bills')
      .select('id, utility_type, amount, currency, status, billed_to, bill_date, utility_scope, property_id, units(unit_number, properties(id, name)), properties(id, name)')
      .eq('organization_id', orgId)
      .order('bill_date', { ascending: false }),
    admin.from('organizations').select('name, default_currency').eq('id', orgId).single(),
    admin.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
  ])

  const currency = (orgRes.data?.default_currency as string) ?? 'OMR'
  const orgName  = (orgRes.data?.name as string) ?? ''
  const properties = (propertiesRes.data ?? []) as { id: string; name: string }[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Bill = Record<string, any>
  const allBills = (billsRes.data ?? []) as Bill[]

  // Helper: resolve property id from a bill (general bills store property_id directly; unit bills via join)
  const billPropId = (b: Bill): string =>
    (b.utility_scope === 'general' ? b.property_id : (b.units as Bill)?.properties?.id) ?? ''

  const bills = propertyId
    ? allBills.filter(b => billPropId(b) === propertyId)
    : allBills

  // ── Summary stats ─────────────────────────────────────────────────────────
  const total   = bills.reduce((s, b) => s + Number(b.amount), 0)
  const paid    = bills.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.amount), 0)
  const pending = bills.filter(b => b.status === 'pending').reduce((s, b) => s + Number(b.amount), 0)
  const invoiced= bills.filter(b => b.status === 'invoiced').reduce((s, b) => s + Number(b.amount), 0)
  const paidCnt    = bills.filter(b => b.status === 'paid').length
  const pendingCnt = bills.filter(b => b.status === 'pending').length
  const invoicedCnt= bills.filter(b => b.status === 'invoiced').length

  // ── By utility type ──────────────────────────────────────────────────────
  const byType: Record<string, { count: number; total: number }> = {}
  for (const b of bills) {
    const t = (b.utility_type as string) ?? 'other'
    if (!byType[t]) byType[t] = { count: 0, total: 0 }
    byType[t].count++
    byType[t].total += Number(b.amount)
  }
  const typeRows = Object.entries(byType)
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.total - a.total)

  // ── By property ──────────────────────────────────────────────────────────
  const byProp: Record<string, { name: string; count: number; total: number }> = {}
  for (const b of bills) {
    const isGeneral = b.utility_scope === 'general'
    const prop = isGeneral ? b.properties : (b.units as Bill)?.properties
    const key  = prop?.id ?? '__none__'
    const name = prop?.name ?? 'Unknown'
    if (!byProp[key]) byProp[key] = { name, count: 0, total: 0 }
    byProp[key].count++
    byProp[key].total += Number(b.amount)
  }
  const propRows = Object.values(byProp).sort((a, b) => b.total - a.total)

  // ── By billed_to ─────────────────────────────────────────────────────────
  const byPayer: Record<string, { count: number; total: number }> = {}
  for (const b of bills) {
    const p = (b.billed_to as string) ?? 'owner'
    if (!byPayer[p]) byPayer[p] = { count: 0, total: 0 }
    byPayer[p].count++
    byPayer[p].total += Number(b.amount)
  }
  const payerRows = Object.entries(byPayer).map(([payer, v]) => ({ payer, ...v })).sort((a, b) => b.total - a.total)

  // ── Monthly trend (last 12 months) ───────────────────────────────────────
  const months12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1)
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
  })
  const byMonth: Record<string, { count: number; total: number }> = {}
  for (const mk of months12) byMonth[mk] = { count: 0, total: 0 }
  for (const b of bills) {
    const mk = (b.bill_date as string)?.substring(0, 7)
    if (mk && byMonth[mk]) { byMonth[mk].count++; byMonth[mk].total += Number(b.amount) }
  }
  const monthRows = months12.map(mk => ({ month: mk, label: monthLabel(mk), ...byMonth[mk] }))
  const maxMonthTotal = Math.max(...monthRows.map(r => r.total), 1)

  // ── Status breakdown ─────────────────────────────────────────────────────
  const statusRows = [
    { status: 'paid',     count: paidCnt,     total: paid },
    { status: 'invoiced', count: invoicedCnt, total: invoiced },
    { status: 'pending',  count: pendingCnt,  total: pending },
  ].filter(r => r.count > 0)

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      {/* ── Header ── */}
      <div className="flex items-start justify-between no-print flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Utility Statistics & Trends</h2>
          <p className="text-slate-500 text-sm mt-0.5">Spending breakdown by type, property and monthly trend</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PropertySelectClient properties={properties} selectedId={propertyId} />
          <UtilityTrendsExcelButton
            typeRows={typeRows} propRows={propRows} payerRows={payerRows} monthRows={monthRows}
            statusRows={statusRows} total={total} currency={currency}
          />
          <PrintButton />
        </div>
      </div>
      <PrintHeader reportTitle="Utility Statistics & Trends" orgName={orgName} userName={userName} printDate={printDate} />

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-slate-800">{bills.length}</div>
          <div className="text-xs text-slate-500 mt-1">Total Bills</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-slate-700"><OmrAmount value={total} /></div>
          <div className="text-xs text-slate-500 mt-1">Total Amount</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-emerald-700"><OmrAmount value={paid} /></div>
          <div className="text-xs text-slate-500 mt-1">Paid ({paidCnt} bills)</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-amber-700"><OmrAmount value={pending + invoiced} /></div>
          <div className="text-xs text-slate-500 mt-1">Outstanding ({pendingCnt + invoicedCnt} bills)</div>
        </div>
      </div>

      {/* ── Type + Property ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By type */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={15} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">By Utility Type</h3>
          </div>
          <div className="space-y-4">
            {typeRows.map(t => (
              <div key={t.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{TYPE_LABEL[t.type] ?? t.type}</span>
                  <span className="text-slate-900 font-semibold"><OmrAmount value={t.total} /></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${TYPE_COLOR[t.type] ?? 'bg-slate-400'}`}
                      style={{ width: `${Math.min(100, total > 0 ? (t.total / total) * 100 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-16 text-right">{t.count} bills · {total > 0 ? Math.round((t.total / total) * 100) : 0}%</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Avg <OmrAmount value={t.count > 0 ? t.total / t.count : 0} /> per bill</div>
              </div>
            ))}
            {typeRows.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
          </div>
        </div>

        {/* By property */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={15} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">By Property</h3>
          </div>
          <div className="space-y-3">
            {propRows.map(p => (
              <div key={p.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{p.name}</span>
                  <span className="text-slate-900 font-semibold"><OmrAmount value={p.total} /></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-sky-400 h-2 rounded-full" style={{ width: `${Math.min(100, total > 0 ? (p.total / total) * 100 : 0)}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{p.count} bills</span>
                </div>
              </div>
            ))}
            {propRows.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
          </div>
        </div>
      </div>

      {/* ── Monthly Trend ── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Monthly Trend — Last 12 Months</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs">Month</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs">Bills</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs w-2/5">Amount</th>
                <th className="px-4 py-2.5 font-semibold text-slate-600 text-xs">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthRows.map((r, i) => (
                <tr key={r.month} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{r.label}</td>
                  <td className="px-4 py-2.5 text-slate-500">{r.count || '—'}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{r.total > 0 ? <OmrAmount value={r.total} /> : '—'}</td>
                  <td className="px-4 py-2.5 w-32">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (r.total / maxMonthTotal) * 100)}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Status + Billed-to ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By status */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={15} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">By Status</h3>
          </div>
          <div className="space-y-3">
            {statusRows.map(s => (
              <div key={s.status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-slate-700 font-medium">{s.status}</span>
                  <span className="text-slate-900 font-semibold"><OmrAmount value={s.total} /></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${STATUS_COLOR[s.status] ?? 'bg-slate-400'}`}
                      style={{ width: `${Math.min(100, total > 0 ? (s.total / total) * 100 : 0)}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{s.count} bills</span>
                </div>
              </div>
            ))}
            {statusRows.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
          </div>
        </div>

        {/* By billed-to */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={15} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">By Billed To</h3>
          </div>
          <div className="space-y-3">
            {payerRows.map(p => (
              <div key={p.payer}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-slate-700 font-medium">{p.payer}</span>
                  <span className="text-slate-900 font-semibold"><OmrAmount value={p.total} /></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-violet-400 h-2 rounded-full"
                      style={{ width: `${Math.min(100, total > 0 ? (p.total / total) * 100 : 0)}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{p.count} bills</span>
                </div>
              </div>
            ))}
            {payerRows.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
