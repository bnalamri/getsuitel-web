import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock, FileQuestion, Printer } from 'lucide-react'
import Link from 'next/link'
import MonthPicker from './MonthPicker'
import PropertyFilter from './PropertyFilter'
import PrintButton from '@/components/PrintButton'

export const dynamic = 'force-dynamic'

const PRINT_CSS = `
@media print {
  aside, header, .no-print { display: none !important; }
  * { overflow: visible !important; }
  body, html { height: auto !important; background: white !important; }
  .card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; break-inside: avoid; }
  tr { break-inside: avoid; }
  @page { margin: 1.5cm; }
}
`

function fmtAmt(n: number, currency = 'OMR') {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

type Status = 'paid' | 'overdue' | 'pending' | 'no_invoice' | 'cheque' | 'cleared'

function StatusBadge({ status }: { status: Status | string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid:        { label: 'Paid',                 cls: 'bg-emerald-100 text-emerald-700' },
    cleared:     { label: 'Paid (Cheque)',         cls: 'bg-emerald-100 text-emerald-700' },
    deposited:   { label: 'Deposited',             cls: 'bg-teal-100 text-teal-700' },
    overdue:     { label: 'Overdue',               cls: 'bg-red-100 text-red-700' },
    bounced:     { label: 'Bounced',               cls: 'bg-red-100 text-red-700' },
    sent:        { label: 'Pending',               cls: 'bg-amber-100 text-amber-700' },
    pending:     { label: 'Pending',               cls: 'bg-amber-100 text-amber-700' },
    registered:  { label: 'Cheque Registered',     cls: 'bg-blue-50 text-blue-600' },
    no_invoice:  { label: 'No invoice yet',        cls: 'bg-slate-100 text-slate-500' },
    cheque:      { label: 'Cheque — see tracker',  cls: 'bg-blue-50 text-blue-600' },
  }
  const s = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

export default async function MonthlyStatementPage({
  searchParams,
}: {
  searchParams: { month?: string; property?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found.</div>

  const { data: orgData } = await supabase
    .from('organizations')
    .select('name, default_currency')
    .eq('id', orgId)
    .single()
  const orgCurrency = (orgData?.default_currency as string) ?? 'OMR'
  const orgName     = (orgData?.name as string) ?? ''

  // -- Resolve month
  const now = new Date()
  const rawMonth = searchParams.month ?? (
    now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  )
  const monthMatch = rawMonth.match(/^(\d{4})-(\d{2})$/)
  const year  = monthMatch ? Number(monthMatch[1]) : now.getFullYear()
  const month = monthMatch ? Number(monthMatch[2]) : now.getMonth() + 1
  const monthStr  = String(month).padStart(2, '0')
  const monthStart = `${year}-${monthStr}-01`
  const monthEnd   = `${year}-${monthStr}-31`
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const printDate  = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  const admin = createAdminClient()

  const [contractsRes, invoicesRes, chequesRes] = await Promise.all([
    admin
      .from('contracts')
      .select(`
        id, rent_amount, currency, payment_method, payment_day,
        tenants(id, full_name),
        units(id, unit_number, properties(id, name))
      `)
      .eq('organization_id', orgId)
      .eq('status', 'active'),

    admin
      .from('invoices')
      .select('id, tenant_id, unit_id, amount, currency, status, due_date, paid_date, payment_method, type')
      .eq('organization_id', orgId)
      .eq('type', 'rent')
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd),

    admin
      .from('cheques')
      .select('id, tenant_id, unit_id, amount, status, due_date, cheque_number')
      .eq('organization_id', orgId)
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd),
  ])

  const contracts = contractsRes.data ?? []
  const invoices  = invoicesRes.data ?? []
  const cheques   = chequesRes.data ?? []

  type Row = {
    contractId: string
    tenant: string
    unit: string
    property: string
    rentAmount: number
    currency: string
    paymentMethod: string
    status: string
    invoiceId?: string
    paidDate?: string
    dueDate?: string
    daysOverdue?: number
    chequeNumber?: string
    propertyId?: string
  }

  const today = now.toISOString().split('T')[0]

  const rows: Row[] = contracts.map(c => {
    const tenant   = (c.tenants as { full_name: string } | null)?.full_name ?? '—'
    const unit     = (c.units as { unit_number: string } | null)?.unit_number ?? '—'
    const property = (c.units as { properties?: { name: string } | null } | null)?.properties?.name ?? '—'
    const unitId   = (c.units as { id: string } | null)?.id

    if (c.payment_method === 'cheque') {
      const cheque = cheques.find(ch => ch.unit_id === unitId)
      if (cheque) {
        return {
          contractId: c.id as string,
          tenant, unit, property,
          rentAmount: Number(c.rent_amount),
          currency: (c.currency as string) ?? orgCurrency,
          paymentMethod: 'Cheque',
          status: cheque.status as string,
          dueDate: cheque.due_date as string | undefined,
          chequeNumber: cheque.cheque_number as string | undefined,
        }
      }
      return {
        contractId: c.id as string,
        tenant, unit, property,
        rentAmount: Number(c.rent_amount),
        currency: (c.currency as string) ?? orgCurrency,
        paymentMethod: 'Cheque',
        status: 'cheque',
      }
    }

    const invoice = invoices.find(inv => inv.unit_id === unitId)
    if (!invoice) {
      return {
        contractId: c.id as string,
        tenant, unit, property,
        rentAmount: Number(c.rent_amount),
        currency: (c.currency as string) ?? orgCurrency,
        paymentMethod: c.payment_method as string ?? 'cash',
        status: 'no_invoice',
      }
    }

    const daysOverdue = invoice.status === 'overdue' && invoice.due_date
      ? Math.floor((now.getTime() - new Date(invoice.due_date + 'T00:00:00').getTime()) / 86400000)
      : undefined

    return {
      contractId: c.id as string,
      tenant, unit, property,
      rentAmount: Number(invoice.amount),
      currency: (invoice.currency as string) ?? orgCurrency,
      paymentMethod: invoice.payment_method as string ?? 'cash',
      status: invoice.status as string,
      invoiceId: invoice.id as string,
      paidDate: invoice.paid_date as string | undefined,
      dueDate: invoice.due_date as string | undefined,
      daysOverdue,
      propertyId: (c.units as { properties?: { id: string } | null } | null)?.properties?.id as string | undefined,
    }
  })

  const order: Record<string, number> = {
    overdue: 0, bounced: 0,
    sent: 1, pending: 1, registered: 1, deposited: 1,
    paid: 2, cleared: 2,
    no_invoice: 3, cheque: 3,
  }
  rows.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))

  const isPaidStatus    = (s: string) => s === 'paid' || s === 'cleared'
  const isOverdueStatus = (s: string) => s === 'overdue' || s === 'bounced'
  const isPendingStatus = (s: string) => ['sent', 'pending', 'registered', 'deposited'].includes(s)

  const counts = {
    paid:       filteredRows.filter(r => isPaidStatus(r.status)).length,
    overdue:    filteredRows.filter(r => isOverdueStatus(r.status)).length,
    pending:    filteredRows.filter(r => isPendingStatus(r.status)).length,
    no_invoice: filteredRows.filter(r => r.status === 'no_invoice' || r.status === 'cheque').length,
  }
  const totalCollected   = filteredRows.filter(r => isPaidStatus(r.status)).reduce((s, r) => s + r.rentAmount, 0)
  const overdueTotal     = filteredRows.filter(r => isOverdueStatus(r.status)).reduce((s, r) => s + r.rentAmount, 0)
  const pendingTotal     = filteredRows.filter(r => isPendingStatus(r.status)).reduce((s, r) => s + r.rentAmount, 0)
  const totalOutstanding = overdueTotal + pendingTotal

  const methodLabel: Record<string, string> = {
    cash: 'Cash', bank_transfer: 'Bank Transfer', mobile_wallet: 'Mobile Wallet',
    cheque: 'Cheque', Cheque: 'Cheque',
  }

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/owner/reports" className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Back to Reports">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Monthly Rent Statement</h2>
            <p className="text-sm text-slate-500 mt-0.5">Rent collection status per tenant{selectedProp ? ' — ' + (propertyList.find(p => p.id === selectedProp)?.name ?? '') : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker month={`${year}-${monthStr}`} />
          <PropertyFilter properties={propertyList} selected={selectedProp} month={`${year}-${monthStr}`} />
          <PrintButton />
        </div>
      </div>

      <div className="hidden print:block mb-4">
        <h2 className="text-xl font-bold text-slate-900">GetSuitel &mdash; Monthly Rent Statement</h2>
        <p className="text-sm text-slate-600 mt-0.5">{orgName} &nbsp;&middot;&nbsp; {monthLabel}</p>
        <p className="text-xs text-slate-400 mt-0.5">Generated: {printDate} &nbsp;&middot;&nbsp; Printed by: <strong>{profile?.full_name ?? ''}</strong></p>
        <div className="mt-3 border border-red-500 rounded-md px-4 py-2 bg-red-50 text-center">
          <p className="text-sm font-bold text-red-600 tracking-wide">STRICTLY CONFIDENTIAL &nbsp;&middot;&nbsp; &#x633;&#x631;&#x64A; &#x644;&#x644;&#x63A;&#x627;&#x64A;&#x629;</p>
          <p className="text-xs text-red-800 mt-1 leading-relaxed">
            This document is intended solely for authorised internal use within the organisation.
            Unauthorised disclosure, copying, distribution or use of this information is strictly prohibited.
          </p>
          <p className="text-xs text-red-800 mt-1 leading-relaxed">
            &#x647;&#x630;&#x647; &#x627;&#x644;&#x648;&#x62B;&#x64A;&#x642;&#x629; &#x645;&#x62E;&#x635;&#x635;&#x629; &#x644;&#x644;&#x627;&#x633;&#x62A;&#x639;&#x645;&#x627;&#x644; &#x627;&#x644;&#x62F;&#x627;&#x62E;&#x644;&#x64A; &#x627;&#x644;&#x645;&#x635;&#x631;&#x62D; &#x628;&#x647; &#x62F;&#x627;&#x62E;&#x644; &#x627;&#x644;&#x645;&#x624;&#x633;&#x633;&#x629; &#x641;&#x642;&#x637;.
          </p>
        </div>
      </div>

      <div className="print:block hidden text-base font-semibold text-slate-700 mt-4">{monthLabel}</div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 flex items-start gap-3">
          <div className="rounded-full bg-emerald-100 p-2 flex-shrink-0">
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-700">{counts.paid}</div>
            <div className="text-xs text-slate-500 mt-0.5">Paid</div>
            {totalCollected > 0 && (
              <div className="text-xs text-emerald-600 font-medium mt-1">{fmtAmt(totalCollected, orgCurrency)}</div>
            )}
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="rounded-full bg-red-100 p-2 flex-shrink-0">
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{counts.overdue}</div>
            <div className="text-xs text-slate-500 mt-0.5">Overdue</div>
            {overdueTotal > 0 && (
              <div className="text-xs text-red-600 font-medium mt-1">{fmtAmt(overdueTotal, orgCurrency)}</div>
            )}
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 flex-shrink-0">
            <Clock size={16} className="text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{counts.pending}</div>
            <div className="text-xs text-slate-500 mt-0.5">Pending</div>
            {pendingTotal > 0 && (
              <div className="text-xs text-amber-600 font-medium mt-1">{fmtAmt(pendingTotal, orgCurrency)}</div>
            )}
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="rounded-full bg-slate-100 p-2 flex-shrink-0">
            <FileQuestion size={16} className="text-slate-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-500">{counts.no_invoice}</div>
            <div className="text-xs text-slate-500 mt-0.5">No invoice yet</div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Rent Status &mdash; {monthLabel}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{filteredRows.length} active contract{filteredRows.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredRows.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">No active contracts found.</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">Unit</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">Tenant</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">Rent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">Paid Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => {
                  const isOverdue = isOverdueStatus(row.status)
                  const isPaid    = isPaidStatus(row.status)
                  const rowBg = isOverdue
                    ? (idx % 2 === 0 ? 'bg-white' : 'bg-red-50/20')
                    : (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')
                  return (
                    <tr key={row.contractId} className={rowBg}>
                      <td className="px-4 py-3 text-slate-700 border-b border-slate-100 font-medium">{row.property}</td>
                      <td className="px-4 py-3 text-slate-700 border-b border-slate-100">{row.unit}</td>
                      <td className="px-4 py-3 text-slate-800 border-b border-slate-100 font-medium">{row.tenant}</td>
                      <td className="px-4 py-3 border-b border-slate-100 text-right font-medium text-slate-900 tabular-nums">
                        {fmtAmt(row.rentAmount, row.currency)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 border-b border-slate-100 capitalize text-xs">
                        {methodLabel[row.paymentMethod] ?? row.paymentMethod}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-100">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={row.status} />
                          {isOverdue && row.daysOverdue !== undefined && row.daysOverdue > 0 && (
                            <span className="text-xs text-red-500 font-medium">{row.daysOverdue} days late</span>
                          )}
                          {row.chequeNumber && (
                            <span className="text-xs text-slate-400 font-mono">#{row.chequeNumber}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 border-b border-slate-100 text-xs">
                        {row.dueDate ? fmtDate(row.dueDate) : '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-slate-100 text-xs">
                        {isPaid && row.paidDate
                          ? <span className="text-emerald-700 font-medium">{fmtDate(row.paidDate)}</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {filteredRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100">
                    <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Totals &mdash; {filteredRows.length} contracts
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums text-sm">
                      {fmtAmt(filteredRows.reduce((s, r) => s + r.rentAmount, 0), orgCurrency)}
                    </td>
                    <td colSpan={4} className="px-4 py-3 text-xs text-slate-500">
                      {fmtAmt(totalCollected, orgCurrency)} collected &nbsp;&middot;&nbsp;
                      <span className={totalOutstanding > 0 ? 'text-orange-600' : 'text-slate-400'}>
                        {fmtAmt(totalOutstanding, orgCurrency)} outstanding
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>

      {filteredRows.some(r => r.paymentMethod === 'Cheque') && (
        <p className="text-xs text-slate-400 no-print">
          Cheque payment details and status tracking are available in{' '}
          <Link href="/dashboard/owner/payments/cheques" className="text-navy-700 hover:underline font-medium">
            Payments &rarr; Cheque Tracker
          </Link>
          .
        </p>
      )}

      <div className="hidden print:block text-xs text-slate-400 text-center mt-8 pt-4 border-t border-slate-200">
        GetSuitel Property Management &nbsp;&middot;&nbsp; Monthly Rent Statement &nbsp;&middot;&nbsp; Confidential &nbsp;&middot;&nbsp; {printDate}
      </div>
    </div>
  )
}
