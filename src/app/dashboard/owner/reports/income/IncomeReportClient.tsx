'use client'
import { useState } from 'react'
import { TrendingUp, Download, Printer } from 'lucide-react'
import { exportIncomeToExcel } from './exportIncomeExcel'
import PrintHeader from '@/components/PrintHeader'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type Invoice = {
  id: string; amount: number; status: string; currency: string
  due_date: string; created_at: string
  unit_id?: string | null
  units?: { property_id?: string | null; properties?: { id: string; name: string } | null } | null
}
type Property = { id: string; name: string }

interface MonthRow {
  month: number; label: string
  issued: number; collected: number; pending: number; overdue: number
  collectionRate: number; currency: string
}

interface PropertyRow {
  propertyId: string; propertyName: string
  issued: number; collected: number; pending: number; overdue: number
}

function getDate(inv: Invoice) {
  return new Date(inv.due_date ?? inv.created_at)
}

export default function IncomeReportClient({ invoices, properties, defaultCurrency, orgName, userName }: {
  invoices: Invoice[]; properties: Property[]; defaultCurrency: string; orgName: string; userName: string
}) {
  const now = new Date()
  const [year,         setYear]         = useState(String(now.getFullYear()))
  const [month,        setMonth]        = useState('')   // '' = show all 12 months
  const [propertyId,   setPropertyId]   = useState('')
  const [currency,     setCurrency]     = useState(defaultCurrency)

  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i))

  // Filter invoices
  const filtered = invoices.filter(inv => {
    const d = getDate(inv)
    if (year && String(d.getFullYear()) !== year) return false
    if (month !== '' && String(d.getMonth()) !== month) return false
    if (propertyId) {
      const pid = (inv.units as any)?.property_id
      if (pid !== propertyId) return false
    }
    if (inv.currency !== currency) return false
    return true
  })

  // ── View A: Year view (12-month breakdown) ────────────────────────────────
  const monthRows: MonthRow[] = MONTHS.map((label, m) => {
    const rows = filtered.filter(inv => getDate(inv).getMonth() === m)
    const issued    = rows.reduce((s, i) => s + Number(i.amount), 0)
    const collected = rows.filter(i => i.status === 'paid' || i.status === 'cleared').reduce((s, i) => s + Number(i.amount), 0)
    const pending   = rows.filter(i => ['sent','deposited','registered'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0)
    const overdue   = rows.filter(i => i.status === 'overdue' || i.status === 'bounced').reduce((s, i) => s + Number(i.amount), 0)
    return { month: m, label, issued, collected, pending, overdue, collectionRate: issued > 0 ? (collected / issued) * 100 : 0, currency }
  })

  const yearTotal = {
    issued:    monthRows.reduce((s, r) => s + r.issued, 0),
    collected: monthRows.reduce((s, r) => s + r.collected, 0),
    pending:   monthRows.reduce((s, r) => s + r.pending, 0),
    overdue:   monthRows.reduce((s, r) => s + r.overdue, 0),
  }
  const yearRate = yearTotal.issued > 0 ? (yearTotal.collected / yearTotal.issued) * 100 : 0

  // ── View B: Month view (property breakdown) ────────────────────────────────
  const propRows: PropertyRow[] = properties.map(p => {
    const rows = filtered.filter(inv => (inv.units as any)?.property_id === p.id)
    return {
      propertyId: p.id, propertyName: p.name,
      issued:    rows.reduce((s, i) => s + Number(i.amount), 0),
      collected: rows.filter(i => i.status === 'paid' || i.status === 'cleared').reduce((s, i) => s + Number(i.amount), 0),
      pending:   rows.filter(i => ['sent','deposited','registered'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0),
      overdue:   rows.filter(i => i.status === 'overdue' || i.status === 'bounced').reduce((s, i) => s + Number(i.amount), 0),
    }
  })

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  const showMonthView = month !== ''
  const selectedMonthLabel = month !== '' ? MONTHS[Number(month)] : ''

  function handleExcel() {
    exportIncomeToExcel({
      orgName, year, month: month !== '' ? MONTHS[Number(month)] : undefined,
      currency, monthRows: showMonthView ? [] : monthRows,
      propRows: showMonthView ? propRows : [],
      yearTotal, yearRate,
    })
  }

  return (
    <div className="p-6 space-y-6 print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl"><TrendingUp size={20} className="text-emerald-600" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Monthly Income Report</h1>
            <p className="text-sm text-slate-500">Rental revenue collected vs. billed</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExcel} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={15} /> Excel
          </button>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer size={15} /> PDF
          </button>
        </div>
      </div>

      {/* Print header (hidden on screen) */}
      <PrintHeader reportTitle="Monthly Income Report" orgName={orgName} userName={userName} />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <select className="input w-28 text-sm" value={year} onChange={e => setYear(e.target.value)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input w-36 text-sm" value={month} onChange={e => setMonth(e.target.value)}>
          <option value="">Full Year</option>
          {MONTHS.map((m, i) => <option key={i} value={String(i)}>{m}</option>)}
        </select>
        {properties.length > 1 && (
          <select className="input w-44 text-sm" value={propertyId} onChange={e => setPropertyId(e.target.value)}>
            <option value="">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select className="input w-24 text-sm" value={currency} onChange={e => setCurrency(e.target.value)}>
          {['OMR','SAR','AED','KWD','QAR','BHD','USD','GBP','EUR'].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Invoiced', value: showMonthView ? propRows.reduce((s,r)=>s+r.issued,0) : yearTotal.issued, color: 'text-slate-900' },
          { label: 'Collected', value: showMonthView ? propRows.reduce((s,r)=>s+r.collected,0) : yearTotal.collected, color: 'text-emerald-700' },
          { label: 'Pending', value: showMonthView ? propRows.reduce((s,r)=>s+r.pending,0) : yearTotal.pending, color: 'text-blue-700' },
          { label: 'Overdue', value: showMonthView ? propRows.reduce((s,r)=>s+r.overdue,0) : yearTotal.overdue, color: 'text-red-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{fmt(value)} {currency}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {showMonthView ? (
        /* Property breakdown for selected month */
        <div className="card overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-700">
            {selectedMonthLabel} {year} — by Property
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Property</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Invoiced</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Collected</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Pending</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Overdue</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {propRows.map(r => (
                <tr key={r.propertyId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.propertyName}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{fmt(r.issued)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{fmt(r.collected)}</td>
                  <td className="px-4 py-3 text-right text-blue-700">{fmt(r.pending)}</td>
                  <td className="px-4 py-3 text-right text-red-700">{fmt(r.overdue)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${r.issued > 0 && (r.collected/r.issued)*100 >= 80 ? 'text-emerald-700' : 'text-orange-700'}`}>
                      {r.issued > 0 ? ((r.collected/r.issued)*100).toFixed(0) : '—'}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* 12-month table */
        <div className="card overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-700">
            {year} — Monthly Breakdown ({currency})
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Month</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Invoiced</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Collected</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Pending</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Overdue</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Collection Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthRows.map(r => (
                <tr key={r.month} className={`hover:bg-slate-50 ${r.issued === 0 ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.label}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{fmt(r.issued)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{fmt(r.collected)}</td>
                  <td className="px-4 py-3 text-right text-blue-700">{fmt(r.pending)}</td>
                  <td className="px-4 py-3 text-right text-red-700">{fmt(r.overdue)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.issued > 0 ? (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${r.collectionRate >= 80 ? 'bg-emerald-500' : 'bg-orange-400'}`} style={{ width: `${Math.min(r.collectionRate, 100)}%` }} />
                        </div>
                        <span className={`font-semibold w-10 text-right ${r.collectionRate >= 80 ? 'text-emerald-700' : 'text-orange-700'}`}>
                          {r.collectionRate.toFixed(0)}%
                        </span>
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
              <tr>
                <td className="px-4 py-3 text-slate-900">Total {year}</td>
                <td className="px-4 py-3 text-right text-slate-900">{fmt(yearTotal.issued)}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{fmt(yearTotal.collected)}</td>
                <td className="px-4 py-3 text-right text-blue-700">{fmt(yearTotal.pending)}</td>
                <td className="px-4 py-3 text-right text-red-700">{fmt(yearTotal.overdue)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={yearRate >= 80 ? 'text-emerald-700' : 'text-orange-700'}>{yearRate.toFixed(0)}%</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
