import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock, FileQuestion, Printer } from 'lucide-react'
import Link from 'next/link'
import MonthPicker from './MonthPicker'
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

type Status = 'paid' | 'overdue' | 'pending' | 'no_invoice' | 'cheque'

function StatusBadge({ status }: { status: Status | string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid:       { label: 'Paid',              cls: 'bg-emerald-100 text-emerald-700' },
    overdue:    { label: 'Overdue',           cls: 'bg-red-100 text-red-700' },
    sent:       { label: 'Pending',           cls: 'bg-amber-100 text-amber-700' },
    pending:    { label: 'Pending',           cls: 'bg-amber-100 text-amber-700' },
    no_invoice: { label: 'No invoice yet',    cls: 'bg-slate-100 text-slate-500' },
    cheque:     { label: 'Cheque — see tracker', cls: 'bg-blue-50 text-blue-600' },
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
  searchParams: { month?: string }
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

  // ── Resolve month ──────────────────────────────────────────────────────────
  const now = new Date()
  const rawMonth = searchParams.month ?? (
    now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  )
  // Validate format
  const monthMatch = rawMonth.match(/^(\d{4})-(\d{2})$/)
  const year  = monthMatch ? Number(monthMatch[1]) : now.getFullYear()
  const month = monthMatch ? Number(monthMatch[2]) : now.getMonth() + 1
  const monthStr  = String(month).padStart(2, '0')
  const monthStart = `${year}-${monthStr}-01`
  const monthEnd   = `${year}-${monthStr}-31`
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const printDate  = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  const admin = createAdminClient()

  // ── Fetch data ─────────────────────────────────────────────────────────────
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

  // ── Build per-contract rows ────────────────────────────────────────────────
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
  }

  const today = now.toISOString().split('T')[0]

  const rows: Row[] = contracts.map(c => {
    const tenant   = (c.tenants as { full_name: string } | null)?.full_name ?? '—'
    const unit     = (c.units as { unit_number: string } | null)?.unit_number ?? '—'
    const property = (c.units as { properties?: { name: string } | null } | null)?.properties?.name ?? '—'
    const unitId   = (c.units as { id: string } | null)?.id

    if (c.payment_method === 'cheque') {
      // Look up cheque for this unit in the selected month
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

    // Non-cheque: look for invoice
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
    }
  })

  // Sort: overdue first, then pending, then paid, then no_invoice
  const order: Record<string, number> = { overdue: 0, sent: 1, pending: 1, paid: 2, no_invoice: 3, cheque: 4 }
  rows.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))

  // ── Summary counts ─────────────────────────────────────────────────────────
  const counts = {
    paid:       rows.filter(r => r.status === 'paid').length,
    overdue:    rows.filter(r => r.status === 'overdue').length,
    pending:    rows.filter(r => ['sent', 'pending'].includes(r.status)).length,
    no_invoice: rows.filter(r => r.status === 'no_invoice').length,
    cheque:     rows.filter(r => r.status === 'cheque' || (r.paymentMethod === 'Cheque' && r.status !== 'cleared' && r.status !== 'bounced')).length,
  }
  const totalCollected   = rows.filter(r => r.status === 'paid').reduce((s, r) => s + r.rentAmount, 0)
  const totalOutstanding = rows.filter(r => ['overdue', 'sent', 'pending'].includes(r.status)).reduce((s, r) => s + r.rentAmount, 0)

  const methodLabel: Record<string, string> = {
    cash: 'Cash', bank_transfer: 'Bank Transfer', mobile_wallet: 'Mobile Wallet',
    cheque: 'Cheque', Cheque: 'Cheque',
  }

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
            <p className="text-sm text-slate-500 mt-0.5">Rent collection status per tenant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker month={`${year}-${monthStr}`} />
          <PrintButton label="Print Statement" />
        </div>
      </div>

      {/* ── Print header (hidden on screen) ──────────────────────────────── */}
      <div className="hidden print:block mb-2">
        <div className="text-lg font-bold text-slate-900">GetSuitel — Monthly Rent Statement</div>
        <div className="text-sm text-slate-600 mt-1">{orgName}  ·  {monthLabel}</div>
        <div className="text-xs text-slate-400 mt-0.5">Generated: {printDate}  ·  {profile?.full_name ?? ''}</div>
        <div className="mt-3 border border-slate-300 rounded px-3 py-2 bg-slate-50 text-xs text-slate-600 text-center">
          CONFIDENTIAL — Internal use only
        </div>
      </div>

      {/* ── Month label for print ─────────────────────────────────────────── */}
      <div className="print:block hidden text-base font-semibold text-slate-700 mt-4">{monthLabel}</div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
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
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 flex-shrink-0">
            <Clock size={16} className="text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{counts.pending}</div>
            <div className="text-xs text-slate-500 mt-0.5">Pending</div>
            {totalOutstanding > 0 && (
              <div className="text-xs text-amber-600 font-medium mt-1">{fmtAmt(totalOutstanding, orgCurrency)}</div>
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

      {/* ── Statement table ─────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">
              Rent Status — {monthLabel}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{rows.length} active contract{rows.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              No active contracts found.
            </div>
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
                {rows.map((row, idx) => {
                  const isOverdue = row.status === 'overdue'
                  const isPaid    = row.status === 'paid'
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
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100">
                    <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Totals — {rows.length} contracts
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums text-sm">
                      {fmtAmt(rows.reduce((s, r) => s + r.rentAmount, 0), orgCurrency)}
                    </td>
                    <td colSpan={4} className="px-4 py-3 text-xs text-slate-500">
                      {fmtAmt(totalCollected, orgCurrency)} collected &nbsp;·&nbsp;
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

      {/* ── Cheque note ────────────────────────────────────────────────────── */}
      {rows.some(r => r.paymentMethod === 'Cheque') && (
        <p className="text-xs text-slate-400 no-print">
          Cheque payment details and status tracking are available in{' '}
          <Link href="/dashboard/owner/payments/cheques" className="text-navy-700 hover:underline font-medium">
            Payments → Cheque Tracker
          </Link>
          .
        </p>
      )}

      {/* ── Print footer ───────────────────────────────────────────────────── */}
      <div className="hidden print:block text-xs text-slate-400 text-center mt-8 pt-4 border-t border-slate-200">
        GetSuitel Property Management  ·  Monthly Rent Statement  ·  Confidential  ·  {printDate}
      </div>
    </div>
  )
}
