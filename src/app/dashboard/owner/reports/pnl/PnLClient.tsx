'use client'
import { useState } from 'react'
import { BarChart3, Download, Printer } from 'lucide-react'
import { exportPnLToExcel } from './exportPnLExcel'
import DateInput from '@/components/DateInput'

type Invoice     = { id: string; amount: number; status: string; currency: string; due_date: string; created_at: string; units?: { property_id?: string | null } | null }
type Expense     = { id: string; date: string; category: string; description: string; amount: number; currency: string; property_id?: string | null }
type Maintenance = { id: string; charge_amount: number | null; charge_payer: string | null; completed_at: string | null; units?: { property_id?: string | null } | null }
type Property    = { id: string; name: string }

const EXPENSE_CATS: Record<string, string> = {
  maintenance: 'Maintenance', utilities: 'Utilities', insurance: 'Insurance',
  management_fee: 'Management Fee', repair: 'Repair', other: 'Other',
}

export default function PnLClient({ invoices, expenses, maintenance, properties, defaultCurrency, orgName }: {
  invoices: Invoice[]; expenses: Expense[]; maintenance: Maintenance[]
  properties: Property[]; defaultCurrency: string; orgName: string
}) {
  const now = new Date()
  const thisYear = now.getFullYear()
  const [from,       setFrom]       = useState(`${thisYear}-01-01`)
  const [to,         setTo]         = useState(now.toISOString().split('T')[0])
  const [propertyId, setPropertyId] = useState('')
  const [currency,   setCurrency]   = useState(defaultCurrency)

  const inRange = (dateStr: string | null | undefined) => {
    if (!dateStr) return false
    return dateStr >= from && dateStr <= to
  }

  // ── Income ────────────────────────────────────────────────────────────────
  const paidInvoices = invoices.filter(inv => {
    if (inv.status !== 'paid') return false
    if (inv.currency !== currency) return false
    const d = inv.due_date ?? inv.created_at
    if (!inRange(d)) return false
    if (propertyId && (inv.units as any)?.property_id !== propertyId) return false
    return true
  })
  const rentIncome = paidInvoices.reduce((s, i) => s + Number(i.amount), 0)

  // Service charges billed to tenants (owner-covered maintenance, paid by tenant — rare but track it)
  const serviceChargesIncome = maintenance.filter(m => {
    if (m.charge_payer !== 'tenant') return false
    if (!inRange(m.completed_at)) return false
    if (propertyId && (m.units as any)?.property_id !== propertyId) return false
    return true
  }).reduce((s, m) => s + Number(m.charge_amount ?? 0), 0)

  const totalIncome = rentIncome + serviceChargesIncome

  // ── Expenses ──────────────────────────────────────────────────────────────
  const filteredExpenses = expenses.filter(e => {
    if (e.currency !== currency) return false
    if (!inRange(e.date)) return false
    if (propertyId && e.property_id !== propertyId) return false
    return true
  })

  // Maintenance charges paid by owner
  const ownerMaintCost = maintenance.filter(m => {
    if (m.charge_payer !== 'owner') return false
    if (!inRange(m.completed_at)) return false
    if (propertyId && (m.units as any)?.property_id !== propertyId) return false
    return true
  }).reduce((s, m) => s + Number(m.charge_amount ?? 0), 0)

  // Group expenses by category
  const expenseByCategory = Object.entries(EXPENSE_CATS).map(([cat, label]) => {
    const total = filteredExpenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0)
    return { cat, label, total }
  }).filter(e => e.total > 0)

  const recordedExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalExpenses    = recordedExpenses + ownerMaintCost
  const netIncome        = totalIncome - totalExpenses
  const margin           = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })

  const pnlData = { from, to, currency, orgName, rentIncome, serviceChargesIncome, totalIncome, expenseByCategory, ownerMaintCost, recordedExpenses, totalExpenses, netIncome, margin }

  return (
    <div className="p-6 space-y-6 print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl"><BarChart3 size={20} className="text-indigo-600" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Income Statement (P&L)</h1>
            <p className="text-sm text-slate-500">Revenue minus expenses for a selected period</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportPnLToExcel(pnlData)} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={15} /> Excel
          </button>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer size={15} /> PDF
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold text-slate-900">{orgName} — Income Statement (P&L)</h1>
        <p className="text-slate-500">{from} to {to} · {currency}</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <div><label className="label text-xs">From</label><DateInput value={from} onChange={setFrom} required /></div>
        <div><label className="label text-xs">To</label><DateInput value={to} onChange={setTo} required min={from} /></div>
        {properties.length > 1 && (
          <div>
            <label className="label text-xs">Property</label>
            <select className="input w-44 text-sm" value={propertyId} onChange={e => setPropertyId(e.target.value)}>
              <option value="">All Properties</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label text-xs">Currency</label>
          <select className="input w-24 text-sm" value={currency} onChange={e => setCurrency(e.target.value)}>
            {['OMR','SAR','AED','KWD','QAR','BHD','USD','GBP','EUR'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* P&L Statement */}
      <div className="max-w-xl space-y-3">
        {/* Income section */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-emerald-700 text-white font-bold text-sm">INCOME</div>
          <div className="divide-y divide-slate-100">
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-slate-600">Rent Collected</span>
              <span className="font-semibold text-slate-900">{fmt(rentIncome)} {currency}</span>
            </div>
            {serviceChargesIncome > 0 && (
              <div className="flex justify-between px-5 py-3 text-sm">
                <span className="text-slate-600">Service Charges (tenant-paid)</span>
                <span className="font-semibold text-slate-900">{fmt(serviceChargesIncome)} {currency}</span>
              </div>
            )}
            <div className="flex justify-between px-5 py-3 text-sm bg-emerald-50">
              <span className="font-bold text-emerald-800">Total Income</span>
              <span className="font-bold text-emerald-800">{fmt(totalIncome)} {currency}</span>
            </div>
          </div>
        </div>

        {/* Expenses section */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-red-700 text-white font-bold text-sm">EXPENSES</div>
          <div className="divide-y divide-slate-100">
            {expenseByCategory.map(({ cat, label, total }) => (
              <div key={cat} className="flex justify-between px-5 py-3 text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold text-red-700">{fmt(total)} {currency}</span>
              </div>
            ))}
            {ownerMaintCost > 0 && (
              <div className="flex justify-between px-5 py-3 text-sm">
                <span className="text-slate-600">Maintenance Charges (owner-paid)</span>
                <span className="font-semibold text-red-700">{fmt(ownerMaintCost)} {currency}</span>
              </div>
            )}
            {totalExpenses === 0 && (
              <div className="px-5 py-3 text-sm text-slate-400">No expenses recorded for this period.</div>
            )}
            <div className="flex justify-between px-5 py-3 text-sm bg-red-50">
              <span className="font-bold text-red-800">Total Expenses</span>
              <span className="font-bold text-red-800">{fmt(totalExpenses)} {currency}</span>
            </div>
          </div>
        </div>

        {/* Net Income */}
        <div className={`card overflow-hidden border-2 ${netIncome >= 0 ? 'border-emerald-300' : 'border-red-300'}`}>
          <div className={`flex items-center justify-between px-5 py-4 ${netIncome >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <div>
              <div className={`text-xs font-semibold uppercase tracking-wide ${netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                Net {netIncome >= 0 ? 'Profit' : 'Loss'}
              </div>
              <div className={`text-2xl font-black mt-1 ${netIncome >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                {netIncome < 0 ? '−' : ''}{fmt(Math.abs(netIncome))} {currency}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Profit Margin</div>
              <div className={`text-xl font-bold ${margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {margin.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Period: {from} to {to} · {currency} only · {propertyId ? properties.find(p=>p.id===propertyId)?.name : 'All Properties'}
        </p>
      </div>
    </div>
  )
}
