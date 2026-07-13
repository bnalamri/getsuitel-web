import type { ReactNode } from 'react'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { BarChart2, TrendingUp, Building2, AlertTriangle, Wrench, Users, CreditCard, FileText, CalendarCheck, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import PrintButton from '@/components/PrintButton'
import TenantDirectoryPDF from './TenantDirectoryPDF'

export const metadata = { title: 'Reports' }
export const dynamic = 'force-dynamic'

const PRINT_CSS = `
@media print {
  aside, header { display: none !important; }
  .no-print { display: none !important; }
  * { overflow: visible !important; }
  body, html { height: auto !important; background: white !important; }
  .card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; break-inside: avoid; margin-bottom: 16px; }
  tr { break-inside: avoid; }
}
`

function fmtAmt(n: number, currency = 'OMR') {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700',
    sent: 'bg-blue-100 text-blue-700',
    overdue: 'bg-red-100 text-red-700',
    bounced: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    deposited: 'bg-blue-100 text-blue-700',
    cleared: 'bg-emerald-100 text-emerald-700',
    active: 'bg-emerald-100 text-emerald-700',
    expired: 'bg-slate-100 text-slate-600',
    terminated: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

function SectionHeader({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-slate-500">{icon}</span>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function EmptyRow({ cols, label = 'No data' }: { cols: number; label?: string }) {
  return <tr><td colSpan={cols} className="px-3 py-5 text-center text-slate-400 text-sm italic">{label}</td></tr>
}

function Th({ children }: { children: ReactNode }) {
  return <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 bg-slate-50">{children}</th>
}

function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-sm text-slate-700 border-b border-slate-100 ${className}`}>{children}</td>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id, full_name').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found</div>

  const { data: orgData } = await supabase.from('organizations').select('default_currency').eq('id', orgId).single()
  const orgCurrency = (orgData?.default_currency as string) ?? 'OMR'

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const admin = createAdminClient()

  const [invRes, maintRes, unitsRes, propsRes, contractsRes, chequesRes, tenantsRes] = await Promise.all([
    admin.from('invoices')
      .select('id, amount, status, type, created_at, due_date, tenants(full_name), units(unit_number, properties(id, name))')
      .eq('organization_id', orgId),
    admin.from('maintenance_requests')
      .select('id, status, category, priority, charge_amount, charge_payer, created_at')
      .eq('organization_id', orgId),
    admin.from('units')
      .select('id, unit_number, status, rent_amount, currency, properties(id, name)')
      .eq('organization_id', orgId),
    admin.from('properties')
      .select('id, name, type, address, city, country')
      .eq('organization_id', orgId),
    admin.from('contracts')
      .select('id, unit_id, status, start_date, end_date, rent_amount, tenants(full_name), units(unit_number, properties(name))')
      .eq('organization_id', orgId),
    admin.from('cheques')
      .select('id, amount, status, due_date, cheque_number, tenants(full_name), units(unit_number)')
      .eq('organization_id', orgId),
    admin.from('tenants')
      .select('id, full_name, email, phone, national_id, nationality, emergency_contact, notes, contracts(id, status, start_date, end_date, rent_amount, units(unit_number, properties(name)))')
      .eq('organization_id', orgId)
      .order('full_name'),
  ])

  const inv: AnyRow[] = invRes.data ?? []
  const maint: AnyRow[] = maintRes.data ?? []
  const u: AnyRow[] = unitsRes.data ?? []
  const props: AnyRow[] = propsRes.data ?? []
  const contracts: AnyRow[] = contractsRes.data ?? []
  const cheques: AnyRow[] = chequesRes.data ?? []
  const tenants: AnyRow[] = tenantsRes.data ?? []

  // KPIs
  const totalRevenue = inv.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const pendingRevenue = inv.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0)
  const occupancyRate = u.length > 0 ? Math.round((u.filter(x => x.status === 'occupied').length / u.length) * 100) : 0
  const openMaint = maint.filter(m => !['completed', 'canceled'].includes(m.status)).length

  // Monthly Income Statement (last 12 months)
  const months12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1)
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
  })
  const invoicedByMonth: Record<string, number> = {}
  const collectedByMonth: Record<string, number> = {}
  inv.forEach(i => {
    const key = (i.created_at as string).slice(0, 7)
    invoicedByMonth[key] = (invoicedByMonth[key] ?? 0) + Number(i.amount)
    if (i.status === 'paid') collectedByMonth[key] = (collectedByMonth[key] ?? 0) + Number(i.amount)
  })
  const totalInvoiced = Object.values(invoicedByMonth).reduce((s, v) => s + v, 0)

  // Property Performance (for section 4)
  const propPerf = props.map(p => {
    const pUnits = u.filter(unit => unit.properties?.id === p.id)
    const pUnitIds = new Set(pUnits.map(unit => unit.id))
    const occupied = pUnits.filter(unit => unit.status === 'occupied').length
    const rentPotential = pUnits.reduce((s, unit) => s + Number(unit.rent_amount), 0)
    const actualRent = contracts
      .filter(contract => contract.status === 'active' && pUnitIds.has(contract.unit_id))
      .reduce((s, contract) => s + Number(contract.rent_amount), 0)
    const collected = inv
      .filter(i => i.status === 'paid' && i.units?.properties?.id === p.id)
      .reduce((s, i) => s + Number(i.amount), 0)
    return { name: p.name as string, total: pUnits.length, occupied, vacant: pUnits.length - occupied,
      occupancy: pUnits.length > 0 ? Math.round((occupied / pUnits.length) * 100) : 0, rentPotential, actualRent, collected }
  })

  // Overdue Rent
  const overdueInv = inv
    .filter(i => i.status === 'overdue' || (i.status === 'sent' && i.due_date && i.due_date < todayStr))
    .map(i => ({
      tenant: i.tenants?.full_name ?? '—',
      unit: i.units?.unit_number ?? '—',
      property: i.units?.properties?.name ?? '—',
      amount: Number(i.amount),
      dueDate: i.due_date ?? i.created_at,
      daysOverdue: Math.max(0, Math.floor((today.getTime() - new Date(i.due_date ?? i.created_at).getTime()) / 86400000)),
      type: i.type as string,
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)

  // Revenue by Type + Maintenance by Category
  const byType = inv.reduce((acc: Record<string, number>, i) => { acc[i.type] = (acc[i.type] ?? 0) + Number(i.amount); return acc }, {})
  const byCategory = maint.reduce((acc: Record<string, number>, m) => { acc[m.category] = (acc[m.category] ?? 0) + 1; return acc }, {})
  const completedMaint = maint.filter(m => m.status === 'completed').length
  const totalInvAmt = totalRevenue + pendingRevenue

  // Maintenance Cost Report
  const maintCostByMonth: Record<string, { owner: number; tenant: number; none: number }> = {}
  maint.filter(m => m.charge_amount != null && Number(m.charge_amount) > 0).forEach(m => {
    const key = (m.created_at as string).slice(0, 7)
    if (!maintCostByMonth[key]) maintCostByMonth[key] = { owner: 0, tenant: 0, none: 0 }
    const amt = Number(m.charge_amount)
    const payer = m.charge_payer ?? 'none'
    if (payer === 'owner') maintCostByMonth[key].owner += amt
    else if (payer === 'tenant') maintCostByMonth[key].tenant += amt
    else maintCostByMonth[key].none += amt
  })
  const maintMonths = Object.keys(maintCostByMonth).sort().reverse().slice(0, 12)

  // Tenant Turnover
  const in90 = new Date(today); in90.setDate(in90.getDate() + 90)
  const ago90 = new Date(today); ago90.setDate(ago90.getDate() - 90)
  const endingSoon = contracts
    .filter(c => c.status === 'active' && c.end_date >= todayStr && c.end_date <= in90.toISOString().slice(0, 10))
    .sort((a, b) => a.end_date.localeCompare(b.end_date))
  const recentlyEnded = contracts
    .filter(c => ['expired', 'terminated'].includes(c.status) && c.end_date >= ago90.toISOString().slice(0, 10))
    .sort((a, b) => b.end_date.localeCompare(a.end_date))

  // Cheque Status
  const pendingCheques = cheques.filter(c => c.status === 'pending').sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
  const overdueCheques = pendingCheques.filter(c => c.due_date && c.due_date < todayStr)
  const upcomingCheques = pendingCheques.filter(c => !c.due_date || c.due_date >= todayStr)
  const bouncedCheques = cheques.filter(c => c.status === 'bounced').sort((a, b) => (b.due_date ?? '').localeCompare(a.due_date ?? ''))
  const chequeStats = {
    pending: cheques.filter(c => c.status === 'pending').length,
    deposited: cheques.filter(c => c.status === 'deposited').length,
    cleared: cheques.filter(c => c.status === 'cleared').length,
    bounced: cheques.filter(c => c.status === 'bounced').length,
  }

  const printDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const printerName = (profile?.full_name as string) || user.email || 'Unknown'
  const dash = '—'

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* Page header */}
      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
          <p className="text-slate-500 text-sm mt-0.5">Financial &amp; operational overview</p>
        </div>
        <PrintButton />
      </div>
      <div className="hidden print:block mb-4">
        <h2 className="text-xl font-bold text-slate-900">GetSuitel Management Reports</h2>
        <p className="text-xs text-slate-500 mt-0.5">Generated: {printDate} &nbsp;·&nbsp; Printed by: <strong>{printerName}</strong></p>
        <div className="mt-3 border border-red-500 rounded-md px-4 py-2 bg-red-50 text-center">
          <p className="text-sm font-bold text-red-600 tracking-wide">STRICTLY CONFIDENTIAL &nbsp;·&nbsp; سري للغاية</p>
          <p className="text-xs text-red-800 mt-1 leading-relaxed">
            This document is intended solely for authorised internal use within the organisation.
            Unauthorised disclosure, copying, distribution or use of this information is strictly prohibited.
          </p>
          <p className="text-xs text-red-800 mt-1 leading-relaxed">
            هذه الوثيقة مخصصة للاستعمال الداخلي المصرح به داخل المؤسسة فقط. يُحظر تمامًا الإفصاح أو النسخ أو التوزيع أو استخدام هذه المعلومات بدون إذن.
          </p>
        </div>
      </div>

      {/* Monthly Statement shortcut */}
      <Link
        href="/dashboard/owner/reports/monthly"
        className="no-print flex items-center justify-between bg-navy-50 border border-navy-200 hover:border-navy-400 hover:bg-navy-100 rounded-xl px-5 py-4 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="bg-navy-700 text-white rounded-lg p-2">
            <CalendarCheck size={16} />
          </div>
          <div>
            <div className="font-semibold text-navy-900 text-sm">Monthly Rent Statement</div>
            <div className="text-xs text-navy-600 mt-0.5">See who paid, who is overdue, and who is pending this month — printable</div>
          </div>
        </div>
        <ArrowRight size={16} className="text-navy-400 group-hover:text-navy-700 transition-colors flex-shrink-0" />
      </Link>

      {/* 1. KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue Collected', value: fmtAmt(totalRevenue, orgCurrency), color: 'text-emerald-700' },
          { label: 'Pending / Overdue', value: fmtAmt(pendingRevenue, orgCurrency), color: 'text-orange-600' },
          { label: 'Occupancy Rate', value: occupancyRate + '%', color: 'text-navy-700' },
          { label: 'Open Maintenance', value: openMaint.toString(), color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={'text-2xl font-bold ' + s.color}>{s.value}</div>
            <div className="text-sm text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 2. Properties List */}
      <div className="card p-5">
        <SectionHeader
          icon={<Building2 size={16} />}
          title="Properties List"
          sub={'Portfolio of ' + props.length + ' propert' + (props.length !== 1 ? 'ies' : 'y')}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Property Name</Th>
                <Th>Type</Th>
                <Th>Address</Th>
                <Th>City</Th>
                <Th>Units</Th>
                <Th>Occupied</Th>
                <Th>Vacant</Th>
                <Th>Occupancy %</Th>
              </tr>
            </thead>
            <tbody>
              {props.length === 0 ? <EmptyRow cols={9} /> : props.map((p, idx) => {
                const pUnits = u.filter(unit => unit.properties?.id === p.id)
                const occ = pUnits.filter(unit => unit.status === 'occupied').length
                const vac = pUnits.filter(unit => unit.status === 'vacant').length
                const inMaint = pUnits.filter(unit => unit.status === 'maintenance').length
                const pct = pUnits.length > 0 ? Math.round((occ / pUnits.length) * 100) : 0
                const addr = p.address ?? ''
                const typeLabel = p.type === 'commercial' ? 'Commercial' : 'Residential'
                const typeCls = p.type === 'commercial' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'
                const barCls = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                const pctCls = pct >= 80 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
                return (
                  <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <Td className="text-slate-400 font-mono text-xs">{idx + 1}</Td>
                    <Td className="font-semibold text-slate-900">{p.name}</Td>
                    <Td><span className={'inline-block px-2 py-0.5 rounded-full text-xs font-medium ' + typeCls}>{typeLabel}</span></Td>
                    <Td className="text-slate-500 max-w-xs truncate">{addr || dash}</Td>
                    <Td>{p.city || dash}</Td>
                    <Td className="font-medium">{pUnits.length}</Td>
                    <Td className="text-emerald-700 font-medium">{occ}</Td>
                    <Td>
                      {vac > 0 && <span className="text-orange-600 font-medium">{vac}</span>}
                      {vac === 0 && <span className="text-slate-300">0</span>}
                      {inMaint > 0 && <span className="text-slate-400 text-xs ml-1">+{inMaint} maint</span>}
                    </Td>
                    <Td>
                      {pUnits.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 bg-slate-100 rounded-full overflow-hidden">
                            <div className={'h-full rounded-full ' + barCls} style={{ width: pct + '%' }} />
                          </div>
                          <span className={'font-semibold text-xs ' + pctCls}>{pct}%</span>
                        </div>
                      ) : <span className="text-slate-300 text-xs">No units</span>}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
            {props.length > 1 && (
              <tfoot>
                <tr className="bg-slate-100">
                  <td colSpan={5} className="px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Portfolio Total</td>
                  <Td className="font-bold">{u.length}</Td>
                  <Td className="font-bold text-emerald-700">{u.filter(x => x.status === 'occupied').length}</Td>
                  <Td className="font-bold text-orange-600">{u.filter(x => x.status === 'vacant').length}</Td>
                  <Td className="font-bold">{occupancyRate}%</Td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 3. Monthly Income Statement */}
      <div className="card p-5">
        <SectionHeader icon={<TrendingUp size={16} />} title="Monthly Income Statement" sub="Last 12 months — invoiced vs collected" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr><Th>Month</Th><Th>Invoiced</Th><Th>Collected</Th><Th>Outstanding</Th><Th>Collection %</Th></tr>
            </thead>
            <tbody>
              {months12.map((key, idx) => {
                const invoiced = invoicedByMonth[key] ?? 0
                const collected = collectedByMonth[key] ?? 0
                const outstanding = invoiced - collected
                const pct = invoiced > 0 ? Math.round((collected / invoiced) * 100) : null
                return (
                  <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <Td className="font-medium">{monthLabel(key)}</Td>
                    <Td>{invoiced > 0 ? fmtAmt(invoiced, orgCurrency) : <span className="text-slate-300">{dash}</span>}</Td>
                    <Td className="text-emerald-700 font-medium">{collected > 0 ? fmtAmt(collected, orgCurrency) : <span className="text-slate-300">{dash}</span>}</Td>
                    <Td className={outstanding > 0 ? 'text-orange-600' : 'text-slate-400'}>{outstanding > 0 ? fmtAmt(outstanding, orgCurrency) : dash}</Td>
                    <Td>
                      {pct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: pct + '%' }} />
                          </div>
                          <span className={pct >= 80 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}>{pct}%</span>
                        </div>
                      ) : <span className="text-slate-300">{dash}</span>}
                    </Td>
                  </tr>
                )
              })}
              <tr className="bg-slate-100">
                <Td className="font-bold text-slate-900">Total</Td>
                <Td className="font-bold">{fmtAmt(totalInvoiced, orgCurrency)}</Td>
                <Td className="font-bold text-emerald-700">{fmtAmt(totalRevenue, orgCurrency)}</Td>
                <Td className="font-bold text-orange-600">{fmtAmt(pendingRevenue, orgCurrency)}</Td>
                <Td className="font-bold">{totalInvoiced > 0 ? Math.round((totalRevenue / totalInvoiced) * 100) + '%' : dash}</Td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Property Performance */}
      <div className="card p-5">
        <SectionHeader icon={<Building2 size={16} />} title="Property Performance" sub="Revenue and occupancy by property" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr><Th>Property</Th><Th>Total Units</Th><Th>Occupied</Th><Th>Vacant</Th><Th>Occupancy</Th><Th>Rent Potential / mo</Th><Th>Actual Rent / mo</Th><Th>Revenue Collected</Th></tr>
            </thead>
            <tbody>
              {propPerf.length === 0 ? <EmptyRow cols={8} /> : propPerf.map((p, idx) => (
                <tr key={p.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                  <Td className="font-medium text-slate-900">{p.name}</Td>
                  <Td>{p.total}</Td>
                  <Td className="text-emerald-700">{p.occupied}</Td>
                  <Td className={p.vacant > 0 ? 'text-orange-600' : 'text-slate-400'}>{p.vacant}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-navy-700 rounded-full" style={{ width: p.occupancy + '%' }} />
                      </div>
                      <span>{p.occupancy}%</span>
                    </div>
                  </Td>
                  <Td>{fmtAmt(p.rentPotential, orgCurrency)}</Td>
                  <Td className="text-blue-700 font-medium">{fmtAmt(p.actualRent, orgCurrency)}</Td>
                  <Td className="text-emerald-700 font-medium">{fmtAmt(p.collected, orgCurrency)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Overdue Rent */}
      <div className="card p-5">
        <SectionHeader
          icon={<AlertTriangle size={16} className="text-red-500" />}
          title="Overdue Rent"
          sub={overdueInv.length > 0 ? overdueInv.length + ' invoice' + (overdueInv.length !== 1 ? 's' : '') + ' overdue' : 'All invoices up to date'}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr><Th>Tenant</Th><Th>Unit</Th><Th>Property</Th><Th>Type</Th><Th>Amount</Th><Th>Due Date</Th><Th>Days Overdue</Th></tr>
            </thead>
            <tbody>
              {overdueInv.length === 0 ? (
                <EmptyRow cols={7} label="No overdue invoices" />
              ) : overdueInv.map((o, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50/30'}>
                  <Td className="font-medium">{o.tenant}</Td>
                  <Td>{o.unit}</Td>
                  <Td>{o.property}</Td>
                  <Td className="capitalize">{o.type}</Td>
                  <Td className="font-medium text-red-700">{fmtAmt(o.amount, orgCurrency)}</Td>
                  <Td>{o.dueDate ? fmtDate(o.dueDate) : dash}</Td>
                  <Td>
                    <span className={'font-semibold ' + (o.daysOverdue > 30 ? 'text-red-700' : o.daysOverdue > 7 ? 'text-orange-600' : 'text-amber-600')}>
                      {o.daysOverdue} days
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Revenue by Type + Maintenance by Category */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <SectionHeader icon={<BarChart2 size={16} />} title="Revenue by Type" />
          {Object.keys(byType).length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-6">No invoice data yet</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, amount]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-slate-700">{type}</span>
                    <span className="font-medium text-slate-900">{fmtAmt(Number(amount), orgCurrency)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div className="h-full bg-navy-700 rounded-full" style={{ width: Math.min((Number(amount) / (totalInvAmt || 1)) * 100, 100) + '%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <SectionHeader icon={<Wrench size={16} />} title="Maintenance by Category" />
          {Object.keys(byCategory).length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-6">No maintenance data yet</div>
          ) : (
            <>
              <div className="space-y-3">
                {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-slate-700">{cat}</span>
                      <span className="font-medium text-slate-900">{count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: (count / maint.length) * 100 + '%' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm text-slate-600">
                <span>{completedMaint} completed</span>
                <span>{openMaint} open</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 7. Maintenance Cost Report */}
      <div className="card p-5">
        <SectionHeader icon={<Wrench size={16} />} title="Maintenance Cost Report" sub="Charge amounts by month and responsible party" />
        {maintMonths.length === 0 ? (
          <div className="text-slate-400 text-sm text-center py-6">No maintenance charges recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr><Th>Month</Th><Th>Owner Charge</Th><Th>Tenant Charge</Th><Th>Unassigned</Th><Th>Total</Th></tr>
              </thead>
              <tbody>
                {maintMonths.map((key, idx) => {
                  const row = maintCostByMonth[key]
                  const total = row.owner + row.tenant + row.none
                  return (
                    <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <Td className="font-medium">{monthLabel(key)}</Td>
                      <Td className={row.owner > 0 ? 'text-red-600' : 'text-slate-300'}>{row.owner > 0 ? fmtAmt(row.owner, orgCurrency) : dash}</Td>
                      <Td className={row.tenant > 0 ? 'text-orange-600' : 'text-slate-300'}>{row.tenant > 0 ? fmtAmt(row.tenant, orgCurrency) : dash}</Td>
                      <Td className="text-slate-400">{row.none > 0 ? fmtAmt(row.none, orgCurrency) : dash}</Td>
                      <Td className="font-semibold">{fmtAmt(total, orgCurrency)}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 8. Tenant Turnover */}
      <div className="card p-5">
        <SectionHeader icon={<Users size={16} />} title="Tenant Turnover" sub="Contracts ending in next 90 days and recently ended" />
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
              Ending in Next 90 Days
              <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{endingSoon.length}</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr><Th>Tenant</Th><Th>Unit</Th><Th>Property</Th><Th>End Date</Th><Th>Days Left</Th><Th>Monthly Rent</Th></tr>
                </thead>
                <tbody>
                  {endingSoon.length === 0 ? (
                    <EmptyRow cols={6} label="No contracts ending in the next 90 days" />
                  ) : endingSoon.map((c, idx) => {
                    const daysLeft = Math.ceil((new Date(c.end_date).getTime() - today.getTime()) / 86400000)
                    return (
                      <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}>
                        <Td className="font-medium">{c.tenants?.full_name ?? dash}</Td>
                        <Td>{c.units?.unit_number ?? dash}</Td>
                        <Td>{c.units?.properties?.name ?? dash}</Td>
                        <Td>{fmtDate(c.end_date)}</Td>
                        <Td>
                          <span className={'font-semibold ' + (daysLeft <= 30 ? 'text-red-600' : daysLeft <= 60 ? 'text-orange-600' : 'text-amber-600')}>
                            {daysLeft} days
                          </span>
                        </Td>
                        <Td>{fmtAmt(Number(c.rent_amount), orgCurrency)}</Td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />
              Recently Ended (Last 90 Days)
              <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{recentlyEnded.length}</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr><Th>Tenant</Th><Th>Unit</Th><Th>Property</Th><Th>End Date</Th><Th>Status</Th><Th>Monthly Rent</Th></tr>
                </thead>
                <tbody>
                  {recentlyEnded.length === 0 ? (
                    <EmptyRow cols={6} label="No contracts ended in the last 90 days" />
                  ) : recentlyEnded.map((c, idx) => (
                    <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <Td className="font-medium">{c.tenants?.full_name ?? dash}</Td>
                      <Td>{c.units?.unit_number ?? dash}</Td>
                      <Td>{c.units?.properties?.name ?? dash}</Td>
                      <Td>{fmtDate(c.end_date)}</Td>
                      <Td><StatusBadge status={c.status} /></Td>
                      <Td>{fmtAmt(Number(c.rent_amount), orgCurrency)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 9. Cheque Status Report */}
      <div className="card p-5">
        <SectionHeader icon={<CreditCard size={16} />} title="Cheque Status Report" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Pending', count: chequeStats.pending, bg: 'bg-amber-50', text: 'text-amber-600' },
            { label: 'Deposited', count: chequeStats.deposited, bg: 'bg-blue-50', text: 'text-blue-700' },
            { label: 'Cleared', count: chequeStats.cleared, bg: 'bg-emerald-50', text: 'text-emerald-700' },
            { label: 'Bounced', count: chequeStats.bounced, bg: 'bg-red-50', text: 'text-red-700' },
          ].map(s => (
            <div key={s.label} className={'rounded-xl p-3 ' + s.bg}>
              <div className={'text-xl font-bold ' + s.text}>{s.count}</div>
              <div className="text-xs text-slate-600 mt-0.5">{s.label} Cheques</div>
            </div>
          ))}
        </div>

        {overdueCheques.length > 0 && (
          <div className="mb-5">
            <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
              <AlertTriangle size={13} /> Overdue Pending Cheques ({overdueCheques.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr><Th>Tenant</Th><Th>Unit</Th><Th>Cheque #</Th><Th>Amount</Th><Th>Due Date</Th><Th>Days Overdue</Th></tr>
                </thead>
                <tbody>
                  {overdueCheques.map((c, idx) => {
                    const days = Math.max(0, Math.floor((today.getTime() - new Date(c.due_date).getTime()) / 86400000))
                    return (
                      <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50/30'}>
                        <Td className="font-medium">{c.tenants?.full_name ?? dash}</Td>
                        <Td>{c.units?.unit_number ?? dash}</Td>
                        <Td className="font-mono text-xs">{c.cheque_number ?? dash}</Td>
                        <Td className="text-red-700 font-medium">{fmtAmt(Number(c.amount), orgCurrency)}</Td>
                        <Td>{c.due_date ? fmtDate(c.due_date) : dash}</Td>
                        <Td><span className="font-semibold text-red-700">{days} days</span></Td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mb-5">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Upcoming Cheques ({upcomingCheques.length})</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr><Th>Tenant</Th><Th>Unit</Th><Th>Cheque #</Th><Th>Amount</Th><Th>Due Date</Th></tr>
              </thead>
              <tbody>
                {upcomingCheques.length === 0 ? (
                  <EmptyRow cols={5} label="No upcoming cheques" />
                ) : upcomingCheques.map((c, idx) => (
                  <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <Td className="font-medium">{c.tenants?.full_name ?? dash}</Td>
                    <Td>{c.units?.unit_number ?? dash}</Td>
                    <Td className="font-mono text-xs">{c.cheque_number ?? dash}</Td>
                    <Td className="font-medium">{fmtAmt(Number(c.amount), orgCurrency)}</Td>
                    <Td>{c.due_date ? fmtDate(c.due_date) : dash}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {bouncedCheques.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
              <AlertTriangle size={13} /> Bounced Cheques ({bouncedCheques.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr><Th>Tenant</Th><Th>Unit</Th><Th>Cheque #</Th><Th>Amount</Th><Th>Due Date</Th></tr>
                </thead>
                <tbody>
                  {bouncedCheques.map((c, idx) => (
                    <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50/30'}>
                      <Td className="font-medium">{c.tenants?.full_name ?? 