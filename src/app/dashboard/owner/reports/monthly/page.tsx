import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ArrowLeft, Building2, CheckCircle2, AlertCircle, Clock, FileQuestion } from 'lucide-react'
import Link from 'next/link'
import PrintButton from '@/components/PrintButton'
import MonthPicker from './MonthPicker'
import PropertyFilter from './PropertyFilter'

export const dynamic = 'force-dynamic'

const PRINT_CSS = `
@media print {
  aside, header { display: none !important; }
  .no-print { display: none !important; }
  * { overflow: visible !important; }
  body, html { height: auto !important; background: white !important; }
  table { break-inside: avoid; }
  tr { break-inside: avoid; }
  .prop-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 24px; }
}
`

function fmtAmt(n: number, currency = 'OMR') {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}

function applyDateFmt(dateStr: string | undefined, fmt: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const dd  = String(d.getDate()).padStart(2, '0')
  const mm  = String(d.getMonth() + 1).padStart(2, '0')
  const mon = d.toLocaleString('en-US', { month: 'short' })
  const yyyy = String(d.getFullYear())
  switch (fmt) {
    case 'MM/DD/YYYY':   return `${mm}/${dd}/${yyyy}`
    case 'YYYY-MM-DD':   return `${yyyy}-${mm}-${dd}`
    case 'DD MMM YYYY':  return `${dd} ${mon} ${yyyy}`
    default:             return `${dd}/${mm}/${yyyy}`   // DD/MM/YYYY
  }
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  paid:       { label: 'Paid',               cls: 'bg-emerald-100 text-emerald-700' },
  cleared:    { label: 'Paid (Cheque)',       cls: 'bg-emerald-100 text-emerald-700' },
  overdue:    { label: 'Overdue',            cls: 'bg-red-100 text-red-700' },
  bounced:    { label: 'Bounced',            cls: 'bg-red-100 text-red-700' },
  sent:       { label: 'Invoice Sent',       cls: 'bg-amber-100 text-amber-700' },
  pending:    { label: 'Pending',            cls: 'bg-amber-100 text-amber-700' },
  registered: { label: 'Cheque Registered',  cls: 'bg-blue-50 text-blue-600' },
  deposited:  { label: 'Deposited',          cls: 'bg-teal-100 text-teal-700' },
  no_invoice: { label: 'No Invoice',         cls: 'bg-slate-100 text-slate-500' },
  cheque:     { label: 'Cheque Pending',     cls: 'bg-slate-100 text-slate-500' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

const isPaid    = (s: string) => s === 'paid' || s === 'cleared'
const isOverdue = (s: string) => s === 'overdue' || s === 'bounced'
const isPending = (s: string) => ['sent', 'pending', 'registered', 'deposited'].includes(s)

const STATUS_ORDER: Record<string, number> = {
  overdue: 0, bounced: 0,
  sent: 1, pending: 1, registered: 1, deposited: 1,
  paid: 2, cleared: 2,
  no_invoice: 3, cheque: 3,
}

type Row = {
  contractId:    string
  tenant:        string
  unit:          string
  property:      string
  propertyId:    string
  rentAmount:    number
  currency:      string
  paymentMethod: string
  status:        string
  invoiceId?:    string
  paidDate?:     string
  dueDate?:      string
  daysOverdue?:  number
  chequeNumber?: string
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', bank_transfer: 'Bank Transfer',
  mobile_wallet: 'Mobile Wallet', cheque: 'Cheque', Cheque: 'Cheque',
}

export default async function MonthlyRentStatement({
  searchParams,
}: {
  searchParams: { month?: string; property?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return (
    <div className="text-slate-400 text-center py-20">No organization found</div>
  )

  const { data: orgData } = await supabase
    .from('organizations').select('name, default_currency, date_format').eq('id', orgId).single()
  const orgCurrency  = (orgData?.default_currency as string) ?? 'OMR'
  const orgName      = (orgData?.name as string) ?? ''
  const orgDateFmt   = (orgData?.date_format as string) ?? 'DD/MM/YYYY'

  const now      = new Date()
  const rawMonth = searchParams.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [yStr, mStr] = rawMonth.split('-')
  const year     = parseInt(yStr, 10)
  const month    = parseInt(mStr, 10)
  const monthStr = String(month).padStart(2, '0')
  const monthStart = `${year}-${monthStr}-01`
  const monthEnd   = new Date(year, month, 0).toISOString().slice(0, 10)
  const monthLabel = new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const printDate  = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  const admin = createAdminClient()

  const [contractsRes, invoicesRes, chequesRes, propsRes] = await Promise.all([
    admin.from('contracts')
      .select(`
        id, rent_amount, currency, payment_method, status,
        units:unit_id ( id, unit_number, properties:property_id ( id, name ) ),
        tenants:tenant_id ( id, full_name )
      `)
      .eq('organization_id', orgId)
      .eq('status', 'active'),
    admin.from('invoices')
      .select('id, amount, status, due_date, paid_date, unit_id, type')
      .eq('organization_id', orgId)
      .eq('type', 'rent')
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd),
    admin.from('cheques')
      .select('id, amount, status, due_date, cheque_number, unit_id')
      .eq('organization_id', orgId)
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd),
    admin.from('properties')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name'),
  ])

  const contracts    = contractsRes.data ?? []
  const invoices     = invoicesRes.data ?? []
  const cheques      = chequesRes.data ?? []
  const allProperties = (propsRes.data ?? []).map(p => ({ id: p.id as string, name: p.name as string }))

  const rows: Row[] = contracts.map(c => {
    const units      = c.units as { id: string; unit_number: string; properties?: { id: string; name: string } | null } | null
    const unitId     = units?.id as string | undefined
    const unit       = (units?.unit_number as string) ?? '—'
    const propObj    = units?.properties
    const property   = (propObj?.name  as string) ?? '—'
    const propertyId = (propObj?.id    as string) ?? '__none__'
    const tenantObj  = c.tenants as { full_name?: string } | null
    const tenant     = (tenantObj?.full_name as string) ?? '—'

    if (c.payment_method === 'cheque' || c.payment_method === 'Cheque') {
      const cheque = cheques.find(ch => ch.unit_id === unitId)
      if (cheque) {
        return {
          contractId:    c.id as string,
          tenant, unit, property, propertyId,
          rentAmount:    Number(c.rent_amount),
          currency:      (c.currency as string) ?? orgCurrency,
          paymentMethod: 'Cheque',
          status:        cheque.status as string,
          dueDate:       cheque.due_date as string | undefined,
          chequeNumber:  cheque.cheque_number as string | undefined,
        }
      }
      return {
        contractId:    c.id as string,
        tenant, unit, property, propertyId,
        rentAmount:    Number(c.rent_amount),
        currency:      (c.currency as string) ?? orgCurrency,
        paymentMethod: 'Cheque',
        status:        'cheque',
      }
    }

    const invoice = invoices.find(inv => inv.unit_id === unitId)
    if (!invoice) {
      return {
        contractId:    c.id as string,
        tenant, unit, property, propertyId,
        rentAmount:    Number(c.rent_amount),
        currency:      (c.currency as string) ?? orgCurrency,
        paymentMethod: (c.payment_method as string) ?? 'cash',
        status:        'no_invoice',
      }
    }

    const daysOverdue = invoice.status === 'overdue' && invoice.due_date
      ? Math.max(0, Math.floor((now.getTime() - new Date(invoice.due_date).getTime()) / 86400000))
      : 0

    return {
      contractId:    c.id as string,
      tenant, unit, property, propertyId,
      rentAmount:    Number(c.rent_amount),
      currency:      (c.currency as string) ?? orgCurrency,
      paymentMethod: (c.payment_method as string) ?? 'cash',
      status:        invoice.status as string,
      invoiceId:     invoice.id as string,
      paidDate:      invoice.paid_date as string | undefined,
      dueDate:       invoice.due_date as string | undefined,
      daysOverdue,
    }
  })

  rows.sort((a, b) => {
    const sp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    if (sp !== 0) return sp
    return a.tenant.localeCompare(b.tenant)
  })

  // Group by property
  const propGroupMap = new Map<string, { name: string; rows: Row[] }>()
  rows.forEach(r => {
    if (!propGroupMap.has(r.propertyId)) {
      propGroupMap.set(r.propertyId, { name: r.property, rows: [] })
    }
    propGroupMap.get(r.propertyId)!.rows.push(r)
  })
  const propGroups = Array.from(propGroupMap.entries())
    .map(([id, g]) => ({ id, name: g.name, rows: g.rows }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Property filter
  const selectedProp    = searchParams.property ?? ''
  const propertyList    = allProperties.length > 0 ? allProperties : propGroups.map(pg => ({ id: pg.id, name: pg.name }))
  const visibleGroups   = selectedProp
    ? propGroups.filter(pg => pg.id === selectedProp)
    : propGroups

  // Overall KPIs (across visible groups only)
  const visibleRows = visibleGroups.flatMap(pg => pg.rows)
  const totalPaid     = visibleRows.filter(r => isPaid(r.status)).reduce((s, r) => s + r.rentAmount, 0)
  const totalOverdue  = visibleRows.filter(r => isOverdue(r.status)).reduce((s, r) => s + r.rentAmount, 0)
  const totalPending  = visibleRows.filter(r => isPending(r.status)).reduce((s, r) => s + r.rentAmount, 0)
  const grandTotal    = visibleRows.reduce((s, r) => s + r.rentAmount, 0)
  const counts = {
    paid:      visibleRows.filter(r => isPaid(r.status)).length,
    overdue:   visibleRows.filter(r => isOverdue(r.status)).length,
    pending:   visibleRows.filter(r => isPending(r.status)).length,
    noInvoice: visibleRows.filter(r => r.status === 'no_invoice' || r.status === 'cheque').length,
  }

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* Screen header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/owner/reports"
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Back to Reports"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Monthly Rent Statement</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {monthLabel} &mdash; {visibleRows.length} active contract{visibleRows.length !== 1 ? 's' : ''}{selectedProp ? '' : ` across ${propGroups.length} ${propGroups.length === 1 ? 'property' : 'properties'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker month={`${year}-${monthStr}`} />
          <PropertyFilter properties={propertyList} selected={selectedProp} month={`${year}-${monthStr}`} />
          <PrintButton />
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
              GetSuitel &mdash; Property Management
            </p>
            <h1 className="text-2xl font-bold text-slate-900">Monthly Rent Statement</h1>
            <p className="text-base text-slate-700 mt-1 font-medium" dir="rtl">كشف الإيجارات الشهري</p>
          </div>
          <div className="text-right text-sm text-slate-600 space-y-1">
            <p className="font-semibold text-slate-900">{orgName}</p>
            <p>{monthLabel}</p>
            <p>Printed: {printDate}</p>
            <p className="mt-2 text-xs font-bold tracking-widest text-red-600 uppercase">
              Strictly Confidential / سري للغاية
            </p>
          </div>
        </div>
      </div>

      {/* Overall KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 mb-3">
            <CheckCircle2 size={18} />
          </div>
          <p className="text-2xl font-bold text-slate-900">{counts.paid}</p>
          <p className="text-sm font-medium text-slate-700">Paid</p>
          {totalPaid > 0 && <p className="text-xs text-emerald-600 mt-0.5">{fmtAmt(totalPaid, orgCurrency)}</p>}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-600 mb-3">
            <AlertCircle size={18} />
          </div>
          <p className="text-2xl font-bold text-slate-900">{counts.overdue}</p>
          <p className="text-sm font-medium text-slate-700">Overdue</p>
          {totalOverdue > 0 && <p className="text-xs text-red-600 mt-0.5">{fmtAmt(totalOverdue, orgCurrency)}</p>}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-600 mb-3">
            <Clock size={18} />
          </div>
          <p className="text-2xl font-bold text-slate-900">{counts.pending}</p>
          <p className="text-sm font-medium text-slate-700">Pending</p>
          {totalPending > 0 && <p className="text-xs text-amber-600 mt-0.5">{fmtAmt(totalPending, orgCurrency)}</p>}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 mb-3">
            <FileQuestion size={18} />
          </div>
          <p className="text-2xl font-bold text-slate-900">{counts.noInvoice}</p>
          <p className="text-sm font-medium text-slate-700">No Invoice</p>
        </div>
      </div>

      {/* Per-property sections */}
      {visibleGroups.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          No active contracts found for {monthLabel}.
        </div>
      ) : (
        <div className="space-y-5">
          {visibleGroups.map(pg => {
            const pRows       = pg.rows
            const pPaid       = pRows.filter(r => isPaid(r.status))
            const pOverdue    = pRows.filter(r => isOverdue(r.status))
            const pPending    = pRows.filter(r => isPending(r.status))
            const pPaidAmt    = pPaid.reduce((s, r) => s + r.rentAmount, 0)
            const pOverdueAmt = pOverdue.reduce((s, r) => s + r.rentAmount, 0)
            const pPendingAmt = pPending.reduce((s, r) => s + r.rentAmount, 0)
            const pTotal      = pRows.reduce((s, r) => s + r.rentAmount, 0)

            return (
              <div key={pg.id} className="prop-section bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Property header row */}
                <div className="bg-slate-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={15} className="text-slate-300" />
                    <span className="font-semibold text-white">{pg.name}</span>
                    <span className="text-xs text-slate-400 ml-1">{pRows.length} contract{pRows.length !== 1 ? 's' : ''}</span>
                  </div>
                  {/* Property mini KPI strip */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 size={13} />
                      <span className="font-semibold">{pPaid.length}</span>
                      {pPaid.length > 0 && (
                        <span className="text-emerald-300 hidden sm:inline">· {fmtAmt(pPaidAmt, orgCurrency)}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-red-400">
                      <AlertCircle size={13} />
                      <span className="font-semibold">{pOverdue.length}</span>
                      {pOverdue.length > 0 && (
                        <span className="text-red-300 hidden sm:inline">· {fmtAmt(pOverdueAmt, orgCurrency)}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Clock size={13} />
                      <span className="font-semibold">{pPending.length}</span>
                      {pPending.length > 0 && (
                        <span className="text-amber-300 hidden sm:inline">· {fmtAmt(pPendingAmt, orgCurrency)}</span>
                      )}
                    </span>
                    <span className="font-bold text-white border-l border-slate-600 pl-4">
                      {fmtAmt(pTotal, orgCurrency)}
                    </span>
                  </div>
                </div>

                {/* Tenant table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Tenant</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Unit</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Method</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Rent</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Due Date</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Status</th>
                        <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-5 py-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pRows.map(row => (
                        <tr key={row.contractId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3 font-medium text-slate-900 whitespace-nowrap">{row.tenant}</td>
                          <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{row.unit}</td>
                          <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                            {METHOD_LABEL[row.paymentMethod] ?? row.paymentMethod}
                          </td>
                          <td className="px-5 py-3 font-mono font-medium text-slate-900 whitespace-nowrap">
                            {fmtAmt(row.rentAmount, row.currency)}
                          </td>
                          <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                            {applyDateFmt(row.dueDate, orgDateFmt)}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {isPaid(row.status) && row.paidDate && (
                              <span className="text-emerald-600">
                                Paid {applyDateFmt(row.paidDate, orgDateFmt)}
                              </span>
                            )}
                            {isOverdue(row.status) && (row.daysOverdue ?? 0) > 0 && (
                              <span className="text-red-600">{row.daysOverdue}d overdue</span>
                            )}
                            {row.chequeNumber && (
                              <span>#{row.chequeNumber}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-slate-700">
                          Property Total
                        </td>
                        <td className="px-5 py-3 font-bold text-slate-900 font-mono whitespace-nowrap">
                          {fmtAmt(pTotal, orgCurrency)}
                        </td>
                        <td colSpan={3} className="px-5 py-3 text-xs text-slate-500">
                          {pPaid.length > 0 && (
                            <span className="text-emerald-600 mr-3">{pPaid.length} paid</span>
                          )}
                          {pOverdue.length > 0 && (
                            <span className="text-red-600 mr-3">{pOverdue.length} overdue</span>
                          )}
                          {pPending.length > 0 && (
                            <span className="text-amber-600">{pPending.length} pending</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Grand total bar */}
      {visibleRows.length > 0 && (
        <div className="bg-slate-800 text-white rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 no-print">
          <div>
            <p className="text-sm font-medium text-slate-300">
              Grand Total &mdash; {visibleRows.length} contract{visibleRows.length !== 1 ? 's' : ''} &bull; {visibleGroups.length} {propGroups.length === 1 ? 'property' : 'properties'}
            </p>
            <p className="text-2xl font-bold mt-0.5">{fmtAmt(grandTotal, orgCurrency)}</p>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Collected</p>
              <p className="font-semibold text-emerald-400">{fmtAmt(totalPaid, orgCurrency)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Overdue</p>
              <p className="font-semibold text-red-400">{fmtAmt(totalOverdue, orgCurrency)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Pending</p>
              <p className="font-semibold text-amber-400">{fmtAmt(totalPending, orgCurrency)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Print grand total */}
      {visibleRows.length > 0 && (
        <div className="hidden print:block border-t-2 border-slate-800 pt-4 mt-6">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-900">
              Grand Total ({visibleRows.length} contract{visibleRows.length !== 1 ? 's' : ''})
            </span>
            <span className="font-bold text-slate-900 font-mono text-lg">{fmtAmt(grandTotal, orgCurrency)}</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-600 mt-2">
            <span className="text-emerald-700">Collected: {fmtAmt(totalPaid, orgCurrency)}</span>
            <span className="text-red-700">Overdue: {fmtAmt(totalOverdue, orgCurrency)}</span>
            <span className="text-amber-700">Pending: {fmtAmt(totalPending, orgCurrency)}</span>
          </div>
        </div>
      )}

      {visibleRows.some(r => r.paymentMethod === 'Cheque' || r.paymentMethod === 'cheque') && (
        <p className="text-xs text-slate-400 no-print">
          * Cheque statuses: Registered → Deposited → Cleared (Paid) / Bounced (Overdue)
        </p>
      )}
    </div>
  )
}
