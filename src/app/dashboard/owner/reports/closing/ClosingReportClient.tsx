'use client'
import { useState, useMemo } from 'react'
import { CalendarCheck, Download, Printer, TrendingUp, AlertTriangle, CheckCircle, Clock, Receipt, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import PrintHeader from '@/components/PrintHeader'

// ── Types ────────────────────────────────────────────────────────────────────
type Invoice = {
  id: string; amount: number | string; status: string; currency: string
  type: string; due_date: string; created_at: string; paid_date?: string | null
  paid_via?: string | null; notes?: string | null
  tenants?: { full_name: string; email: string } | null
  units?: { unit_number: string; properties?: { id: string; name: string } | null } | null
}
type Expense = {
  id: string; description: string; amount: number | string; currency: string
  category: string; date: string; property_id?: string | null
  properties?: { id?: string; name: string } | null
}
type Property = { id: string; name: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmt(n: number, currency = 'OMR') {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}

function fmtDate(d: string, format = 'DD/MM/YYYY') {
  if (!d) return '—'
  const dt = new Date(d)
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const yyyy = String(dt.getFullYear())
  const mon = dt.toLocaleString('en-US', { month: 'short' })
  switch (format) {
    case 'MM/DD/YYYY':  return `${mm}/${dd}/${yyyy}`
    case 'YYYY-MM-DD':  return `${yyyy}-${mm}-${dd}`
    case 'DD MMM YYYY': return `${dd} ${mon} ${yyyy}`
    default:            return `${dd}/${mm}/${yyyy}`
  }
}

const statusColor: Record<string, string> = {
  paid:     'bg-emerald-100 text-emerald-700',
  sent:     'bg-blue-100 text-blue-700',
  overdue:  'bg-red-100 text-red-700',
  draft:    'bg-slate-100 text-slate-500',
  canceled: 'bg-slate-100 text-slate-400',
}

const PAID_VIA: Record<string, string> = {
  cash: 'Cash', cheque: 'Cheque', bank_transfer: 'Bank Transfer', mobile_transfer: 'Mobile Transfer',
}

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  )
}

function StatCard({ label, value, sub, color = 'text-slate-900', bg = 'bg-white' }: {
  label: string; value: string; sub?: string; color?: string; bg?: string
}) {
  return (
    <div className={`card p-4 ${bg}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionTitle({ icon, title, count, countColor = 'bg-slate-100 text-slate-600' }: {
  icon: React.ReactNode; title: string; count?: number; countColor?: string
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-slate-500">{icon}</span>
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {count !== undefined && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${countColor}`}>{count}</span>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ClosingReportClient({
  invoices, expenses, properties, defaultCurrency, dateFormat, orgName, printerName,
}: {
  invoices: Invoice[]
  expenses: Expense[]
  properties: Property[]
  defaultCurrency: string
  dateFormat: string
  orgName: string
  printerName: string
}) {
  const now = new Date()
  // Default to previous completed month
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const [year,       setYear]       = useState(String(prevMonth.getFullYear()))
  const [month,      setMonth]      = useState(String(prevMonth.getMonth())) // 0-indexed
  const [currency,   setCurrency]   = useState(defaultCurrency)
  const [propertyId, setPropertyId] = useState<string>('') // '' = all properties
  const [showArrears, setShowArrears] = useState(true)

  const years = Array.from({ length: 4 }, (_, i) => String(now.getFullYear() - i))

  const selectedYear  = Number(year)
  const selectedMonth = Number(month) // 0-indexed
  const monthLabel    = `${MONTHS[selectedMonth]} ${year}`

  // Date range for the selected month
  const monthStart = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-01`
  const lastDay    = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const monthEnd   = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // ── Invoice splits ─────────────────────────────────────────────────────────
  const allCurrInvoices = useMemo(
    () => invoices.filter(i => {
      if (i.currency !== currency || i.status === 'canceled') return false
      if (propertyId && i.units?.properties?.id !== propertyId) return false
      return true
    }),
    [invoices, currency, propertyId]
  )

  const allCurrExpenses = useMemo(
    () => propertyId
      ? expenses.filter(e => e.property_id === propertyId)
      : expenses,
    [expenses, propertyId]
  )

  // This month's invoices (due_date in selected month)
  const thisMonthInvoices = useMemo(
    () => allCurrInvoices.filter(i => i.due_date >= monthStart && i.due_date <= monthEnd),
    [allCurrInvoices, monthStart, monthEnd]
  )

  // Carry-forward arrears: due before this month, still unpaid
  const arrearsInvoices = useMemo(
    () => allCurrInvoices
      .filter(i => i.due_date < monthStart && ['overdue', 'sent'].includes(i.status))
      .sort((a, b) => a.due_date.localeCompare(b.due_date)), // oldest first
    [allCurrInvoices, monthStart]
  )

  // This month's expenses
  const thisMonthExpenses = useMemo(
    () => allCurrExpenses.filter(e => e.currency === currency && e.date >= monthStart && e.date <= monthEnd),
    [allCurrExpenses, currency, monthStart, monthEnd]
  )

  // ── Totals ────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const invoiced  = thisMonthInvoices.reduce((s, i) => s + Number(i.amount), 0)
    const collected = thisMonthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
    const overdue   = thisMonthInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
    const pending   = thisMonthInvoices.filter(i => i.status === 'sent').reduce((s, i) => s + Number(i.amount), 0)
    const expTotal  = thisMonthExpenses.reduce((s, e) => s + Number(e.amount), 0)
    const arrears   = arrearsInvoices.reduce((s, i) => s + Number(i.amount), 0)
    const netIncome = collected - expTotal
    const collRate  = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 0
    return { invoiced, collected, overdue, pending, expTotal, arrears, netIncome, collRate }
  }, [thisMonthInvoices, thisMonthExpenses, arrearsInvoices])

  // ── Excel export ──────────────────────────────────────────────────────────
  function handleExcel() {
    const rows: string[][] = []
    const propName = propertyId ? (properties.find(p => p.id === propertyId)?.name ?? propertyId) : 'All Properties'
    rows.push([`${orgName} — Month-End Closing Report — ${monthLabel} — ${propName}`])
    rows.push([`Generated: ${new Date().toLocaleDateString()}`, `Prepared by: ${printerName}`])
    rows.push([])

    rows.push(['=== SUMMARY ==='])
    rows.push(['Invoiced This Month', totals.invoiced.toFixed(3), currency])
    rows.push(['Collected This Month', totals.collected.toFixed(3), currency])
    rows.push(['Outstanding (Overdue)', totals.overdue.toFixed(3), currency])
    rows.push(['Outstanding (Pending)', totals.pending.toFixed(3), currency])
    rows.push(['Carry-forward Arrears', totals.arrears.toFixed(3), currency])
    rows.push(['Expenses This Month', totals.expTotal.toFixed(3), currency])
    rows.push(['Net Income', totals.netIncome.toFixed(3), currency])
    rows.push(['Collection Rate', totals.collRate + '%'])
    rows.push([])

    rows.push(['=== THIS MONTH INVOICES ==='])
    rows.push(['Tenant', 'Unit', 'Property', 'Type', 'Amount', 'Due Date', 'Status', 'Paid Via'])
    thisMonthInvoices.forEach(i => {
      rows.push([
        i.tenants?.full_name ?? '—',
        i.units?.unit_number ?? '—',
        i.units?.properties?.name ?? '—',
        i.type,
        Number(i.amount).toFixed(3),
        i.due_date,
        i.status,
        PAID_VIA[i.paid_via ?? ''] ?? i.paid_via ?? '—',
      ])
    })
    rows.push([])

    rows.push(['=== CARRY-FORWARD ARREARS (Unpaid from prior months) ==='])
    rows.push(['Tenant', 'Unit', 'Property', 'Type', 'Amount', 'Due Date', 'Status', 'Days Overdue'])
    const today = new Date().toISOString().slice(0, 10)
    arrearsInvoices.forEach(i => {
      const days = Math.max(0, Math.floor((Date.now() - new Date(i.due_date).getTime()) / 86400000))
      rows.push([
        i.tenants?.full_name ?? '—',
        i.units?.unit_number ?? '—',
        i.units?.properties?.name ?? '—',
        i.type,
        Number(i.amount).toFixed(3),
        i.due_date,
        i.status,
        String(days),
      ])
    })
    rows.push([])

    rows.push(['=== EXPENSES ==='])
    rows.push(['Description', 'Category', 'Property', 'Amount', 'Date'])
    thisMonthExpenses.forEach(e => {
      rows.push([e.description, e.category, e.properties?.name ?? '—', Number(e.amount).toFixed(3), e.date])
    })

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `GetSuitel_Closing_${year}_${String(selectedMonth + 1).padStart(2, '0')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const printDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="p-6 space-y-6 print:p-0">

      {/* ── Print header ─────────────────────────────────────────────────── */}
      <PrintHeader reportTitle="Month-End Closing Report" orgName={orgName} userName={printerName} printDate={printDate} />

      {/* ── Screen header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-navy-50 rounded-xl">
            <CalendarCheck size={20} className="text-navy-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Month-End Closing Report</h1>
            <p className="text-sm text-slate-500">Full financial summary for a selected month</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExcel} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer size={15} /> Print / PDF
          </button>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <select className="input w-36 text-sm" value={month} onChange={e => setMonth(e.target.value)}>
          {MONTHS.map((m, i) => <option key={i} value={String(i)}>{m}</option>)}
        </select>
        <select className="input w-28 text-sm" value={year} onChange={e => setYear(e.target.value)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input w-24 text-sm" value={currency} onChange={e => setCurrency(e.target.value)}>
          {['OMR','SAR','AED','KWD','QAR','BHD','USD','GBP','EUR'].map(c => <option key={c}>{c}</option>)}
        </select>
        {properties.length > 0 && (
          <select className="input w-44 text-sm" value={propertyId} onChange={e => setPropertyId(e.target.value)}>
            <option value="">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <span className="text-sm text-slate-400">
          Showing: <strong className="text-slate-700">{monthLabel}</strong>
          {propertyId && properties.length > 0 && (
            <> · <strong className="text-slate-700">{properties.find(p => p.id === propertyId)?.name}</strong></>
          )}
        </span>
      </div>

      {/* ── Summary KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Invoiced This Month"
          value={fmt(totals.invoiced, currency)}
          sub={`${thisMonthInvoices.length} invoice${thisMonthInvoices.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Collected"
          value={fmt(totals.collected, currency)}
          sub={`${totals.collRate}% collection rate`}
          color="text-emerald-700"
          bg="bg-emerald-50/30"
        />
        <StatCard
          label="Outstanding (This Month)"
          value={fmt(totals.overdue + totals.pending, currency)}
          sub={totals.overdue > 0 ? `${fmt(totals.overdue, currency)} overdue` : 'None overdue'}
          color={totals.overdue > 0 ? 'text-red-700' : 'text-amber-700'}
          bg={totals.overdue > 0 ? 'bg-red-50/30' : 'bg-amber-50/30'}
        />
        <StatCard
          label="Carry-forward Arrears"
          value={totals.arrears > 0 ? fmt(totals.arrears, currency) : 'None'}
          sub={`${arrearsInvoices.length} unpaid from prior months`}
          color={totals.arrears > 0 ? 'text-red-800' : 'text-slate-400'}
          bg={totals.arrears > 0 ? 'bg-red-100/40' : ''}
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Expenses This Month"
          value={thisMonthExpenses.length > 0 ? fmt(totals.expTotal, currency) : '—'}
          sub={`${thisMonthExpenses.length} expense record${thisMonthExpenses.length !== 1 ? 's' : ''}`}
          color="text-orange-700"
        />
        <StatCard
          label="Net Income (Collected − Expenses)"
          value={fmt(totals.netIncome, currency)}
          sub={totals.netIncome >= 0 ? 'Positive' : 'Negative — expenses exceed collections'}
          color={totals.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}
          bg={totals.netIncome >= 0 ? 'bg-emerald-50/30' : 'bg-red-50/30'}
        />
        <div className="card p-4 flex flex-col justify-center">
          <p className="text-xs text-slate-500 mb-2">Collection Rate</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${totals.collRate >= 80 ? 'bg-emerald-500' : totals.collRate >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                style={{ width: `${Math.min(totals.collRate, 100)}%` }}
              />
            </div>
            <span className={`text-xl font-bold ${totals.collRate >= 80 ? 'text-emerald-700' : totals.collRate >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
              {totals.collRate}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Section 1: This Month's Invoices ─────────────────────────────── */}
      <div className="card p-5">
        <SectionTitle
          icon={<TrendingUp size={16} />}
          title={`${monthLabel} Invoices`}
          count={thisMonthInvoices.length}
          countColor="bg-blue-100 text-blue-700"
        />
        {thisMonthInvoices.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No invoices with due date in {monthLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Tenant</th>
                  <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Unit</th>
                  <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Type</th>
                  <th className="text-right px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Amount</th>
                  <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Due Date</th>
                  <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Paid Date</th>
                  <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {thisMonthInvoices.map((inv, idx) => (
                  <tr key={inv.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-3 py-2.5 font-medium text-slate-900 text-sm">{inv.tenants?.full_name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600 text-xs">
                      <div>{inv.units?.properties?.name}</div>
                      <div className="text-slate-400">Unit {inv.units?.unit_number}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 capitalize text-sm">{inv.type}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold text-sm ${inv.status === 'paid' ? 'text-emerald-700' : inv.status === 'overdue' ? 'text-red-700' : 'text-slate-900'}`}>
                      {fmt(Number(inv.amount), currency)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 text-sm">{fmtDate(inv.due_date, dateFormat)}</td>
                    <td className="px-3 py-2.5 text-sm">
                      {inv.paid_date
                        ? <span className="text-emerald-700 font-medium">{fmtDate(inv.paid_date, dateFormat)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5"><Badge status={inv.status} /></td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{inv.paid_via ? (PAID_VIA[inv.paid_via] ?? inv.paid_via) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-200 font-semibold">
                <tr>
                  <td colSpan={3} className="px-3 py-2.5 text-slate-700 text-sm">Month Total</td>
                  <td className="px-3 py-2.5 text-right text-sm text-slate-900">{fmt(totals.invoiced, currency)}</td>
                  <td colSpan={2} className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-sm">
                    <span className="text-emerald-700">{fmt(totals.collected, currency)} paid</span>
                    {totals.overdue > 0 && <span className="text-red-600 ml-2">{fmt(totals.overdue, currency)} overdue</span>}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 2: Carry-forward Arrears ─────────────────────────────── */}
      <div className={`card p-5 ${totals.arrears > 0 ? 'border border-red-200' : ''}`}>
        <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setShowArrears(v => !v)}>
          <SectionTitle
            icon={<AlertTriangle size={16} className={totals.arrears > 0 ? 'text-red-500' : 'text-slate-400'} />}
            title="Carry-forward Arrears"
            count={arrearsInvoices.length}
            countColor={totals.arrears > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}
          />
          <button className="text-slate-400 hover:text-slate-600 print:hidden">
            {showArrears ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        {totals.arrears > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-4 text-sm text-red-700">
            <AlertTriangle size={14} />
            <strong>{fmt(totals.arrears, currency)}</strong> unpaid from months prior to {monthLabel} — requires immediate follow-up
          </div>
        )}
        {showArrears && (
          arrearsInvoices.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-700 text-sm py-4">
              <CheckCircle size={16} /> No carry-forward arrears — all prior invoices are settled
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Tenant</th>
                    <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Unit</th>
                    <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Type</th>
                    <th className="text-right px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Amount</th>
                    <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Original Due Date</th>
                    <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Days Overdue</th>
                    <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {arrearsInvoices.map((inv, idx) => {
                    const days = Math.max(0, Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000))
                    return (
                      <tr key={inv.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50/20'}>
                        <td className="px-3 py-2.5 font-medium text-slate-900 text-sm">{inv.tenants?.full_name ?? '—'}</td>
                        <td className="px-3 py-2.5 text-slate-600 text-xs">
                          <div>{inv.units?.properties?.name}</div>
                          <div className="text-slate-400">Unit {inv.units?.unit_number}</div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 capitalize text-sm">{inv.type}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-red-700 text-sm">{fmt(Number(inv.amount), currency)}</td>
                        <td className="px-3 py-2.5 text-slate-600 text-sm">{fmtDate(inv.due_date, dateFormat)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`font-semibold text-sm ${days > 60 ? 'text-red-700' : days > 30 ? 'text-orange-600' : 'text-amber-600'}`}>
                            {days} days
                          </span>
                        </td>
                        <td className="px-3 py-2.5"><Badge status={inv.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-red-50 border-t-2 border-red-200 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2.5 text-red-700 text-sm">Total Arrears</td>
                    <td className="px-3 py-2.5 text-right text-red-700 text-sm">{fmt(totals.arrears, currency)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── Section 3: Expenses ───────────────────────────────────────────── */}
      <div className="card p-5">
        <SectionTitle
          icon={<Receipt size={16} />}
          title={`Expenses — ${monthLabel}`}
          count={thisMonthExpenses.length}
          countColor="bg-orange-100 text-orange-700"
        />
        {thisMonthExpenses.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No expenses logged for {monthLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Description</th>
                  <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Category</th>
                  <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Property</th>
                  <th className="text-right px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Amount</th>
                  <th className="text-left px-3 py-2.5 text-slate-600 font-semibold text-xs uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {thisMonthExpenses.map((exp, idx) => (
                  <tr key={exp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-3 py-2.5 text-slate-900 font-medium text-sm">{exp.description}</td>
                    <td className="px-3 py-2.5 text-slate-500 capitalize text-sm">{exp.category}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-sm">{exp.properties?.name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-orange-700 font-semibold text-sm">{fmt(Number(exp.amount), currency)}</td>
                    <td className="px-3 py-2.5 text-slate-600 text-sm">{fmtDate(exp.date, dateFormat)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-200 font-semibold">
                <tr>
                  <td colSpan={3} className="px-3 py-2.5 text-slate-700 text-sm">Total Expenses</td>
                  <td className="px-3 py-2.5 text-right text-orange-700 text-sm">{fmt(totals.expTotal, currency)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 4: Net Income Summary ────────────────────────────────── */}
      <div className={`card p-5 border-2 ${totals.netIncome >= 0 ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'}`}>
        <SectionTitle
          icon={<CheckCircle size={16} className={totals.netIncome >= 0 ? 'text-emerald-600' : 'text-red-500'} />}
          title={`Net Income Summary — ${monthLabel}`}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '+ Collected',      value: totals.collected, color: 'text-emerald-700' },
            { label: '− Expenses',       value: totals.expTotal,  color: 'text-orange-700' },
            { label: '= Net Income',     value: totals.netIncome, color: totals.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700', big: true },
            { label: 'Still Outstanding (arrears + this month)', value: totals.arrears + totals.overdue + totals.pending, color: 'text-red-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 bg-white border ${s.big ? 'border-2 border-navy-300' : 'border-slate-200'}`}>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={`font-bold ${s.big ? 'text-2xl' : 'text-lg'} ${s.color}`}>{fmt(s.value, currency)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Print footer */}
      <div className="hidden print:block text-xs text-slate-400 text-center mt-8 pt-4 border-t border-slate-200">
        GetSuitel Property Management · {orgName} · Month-End Closing Report · {monthLabel} · Generated {printDate}
      </div>
    </div>
  )
}
