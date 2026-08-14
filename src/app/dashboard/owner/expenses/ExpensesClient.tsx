'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Pencil, Trash2, Download, Printer } from 'lucide-react'
import DateInput from '@/components/DateInput'
import PrintHeader from '@/components/PrintHeader'
import { exportExpensesToExcel } from './exportExpensesExcel'

const CATEGORIES = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'utilities',   label: 'Utilities' },
  { value: 'insurance',   label: 'Insurance' },
  { value: 'management_fee', label: 'Management Fee' },
  { value: 'repair',      label: 'Repair' },
  { value: 'other',       label: 'Other' },
]

const catColor: Record<string, string> = {
  maintenance:    'bg-orange-100 text-orange-700',
  utilities:      'bg-blue-100 text-blue-700',
  insurance:      'bg-purple-100 text-purple-700',
  management_fee: 'bg-slate-100 text-slate-700',
  repair:         'bg-red-100 text-red-700',
  other:          'bg-slate-100 text-slate-500',
}

type Expense = {
  id: string; date: string; category: string; description: string
  amount: number; currency: string; notes?: string | null
  property_id?: string | null; properties?: { name: string } | null
}
type Property = { id: string; name: string }

const CURRENCIES = ['OMR','SAR','AED','KWD','QAR','BHD','USD','GBP','EUR']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function ExpensesClient({
  expenses, properties, defaultCurrency, orgName, userName,
}: {
  expenses: Expense[]; properties: Property[]; defaultCurrency: string
  orgName: string; userName: string
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // Filters
  const now = new Date()
  const [filterYear,     setFilterYear]     = useState(String(now.getFullYear()))
  const [filterMonth,    setFilterMonth]    = useState('')
  const [filterProperty, setFilterProperty] = useState('')
  const [filterCat,      setFilterCat]      = useState('')

  const initialForm = { date: now.toISOString().split('T')[0], category: 'other', description: '', amount: '', currency: defaultCurrency, property_id: '', notes: '' }
  const [form, setForm] = useState(initialForm)

  function openAdd() { setForm(initialForm); setEditing(null); setError(''); setShowForm(true) }
  function openEdit(e: Expense) {
    setForm({ date: e.date, category: e.category, description: e.description, amount: String(e.amount), currency: e.currency, property_id: e.property_id ?? '', notes: e.notes ?? '' })
    setEditing(e); setError(''); setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditing(null); setError('') }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setLoading(true); setError('')
    const payload = { date: form.date, category: form.category, description: form.description, amount: Number(form.amount), currency: form.currency, notes: form.notes || null, property_id: form.property_id || null }
    const res = editing
      ? await fetch(`/api/expenses/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed'); setLoading(false); return }
    closeForm(); router.refresh(); setLoading(false)
  }

  async function handleDelete(id: string, desc: string) {
    if (!confirm(`Delete expense "${desc}"?`)) return
    setDeleting(id)
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    setDeleting(null); router.refresh()
  }

  // Filter
  const filtered = expenses.filter(e => {
    const d = new Date(e.date)
    if (filterYear && String(d.getFullYear()) !== filterYear) return false
    if (filterMonth && String(d.getMonth()) !== filterMonth) return false
    if (filterProperty && e.property_id !== filterProperty) return false
    if (filterCat && e.category !== filterCat) return false
    return true
  })

  const totalByCurrency = filtered.reduce<Record<string, number>>((acc, e) => {
    acc[e.currency] = (acc[e.currency] ?? 0) + Number(e.amount)
    return acc
  }, {})

  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i))

  const filterLabel = [
    filterYear || 'All Years',
    filterMonth !== '' ? MONTHS[parseInt(filterMonth)] : 'All Months',
    filterProperty ? (properties.find(p => p.id === filterProperty)?.name ?? '') : 'All Properties',
    filterCat ? (CATEGORIES.find(c => c.value === filterCat)?.label ?? '') : 'All Categories',
  ].filter(Boolean).join(' · ')

  async function handleExcelExport() {
    setExporting(true)
    await exportExpensesToExcel({
      orgName,
      filterLabel,
      rows: filtered.map(e => ({
        date: e.date,
        category: CATEGORIES.find(c => c.value === e.category)?.label ?? e.category,
        description: e.description,
        propertyName: (e.properties as { name: string } | null)?.name ?? '',
        amount: Number(e.amount),
        currency: e.currency,
        notes: e.notes,
      })),
    })
    setExporting(false)
  }

  return (
    <div className="space-y-4">
      {/* Print header — visible always, styled in print */}
      <PrintHeader
        reportTitle="Expenses Report"
        orgName={orgName}
        userName={userName}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap justify-between print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <select className="input w-28 text-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input w-28 text-sm" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <option value="">All Months</option>
            {MONTHS.map((m, i) => <option key={i} value={String(i)}>{m}</option>)}
          </select>
          {properties.length > 0 && (
            <select className="input w-44 text-sm" value={filterProperty} onChange={e => setFilterProperty(e.target.value)}>
              <option value="">All Properties</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <select className="input w-40 text-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExcelExport}
            disabled={exporting || filtered.length === 0}
            className="btn-secondary flex items-center gap-2 text-sm"
            title="Export to Excel"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Excel
          </button>
          <button
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-2 text-sm"
            title="Print / Save as PDF"
          >
            <Printer size={15} /> PDF
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary chips */}
      {Object.entries(totalByCurrency).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-slate-500 self-center">Total:</span>
          {Object.entries(totalByCurrency).map(([cur, total]) => (
            <span key={cur} className="inline-flex items-center gap-1 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
              {total.toLocaleString(undefined, { minimumFractionDigits: 3 })} {cur}
            </span>
          ))}
          <span className="text-xs text-slate-400 self-center">({filtered.length} entries)</span>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">No expenses found for the selected filters.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Date</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Category</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Description</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Property</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Amount</th>
                <th className="px-4 py-3 print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{e.date}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${catColor[e.category] ?? catColor.other}`}>
                      {CATEGORIES.find(c => c.value === e.category)?.label ?? e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{e.description}</div>
                    {e.notes && <div className="text-xs text-slate-400 mt-0.5">{e.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{(e.properties as { name: string } | null)?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-700">
                    {Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 3 })} {e.currency}
                  </td>
                  <td className="px-4 py-3 print:hidden">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(e)} className="text-slate-400 hover:text-navy-700 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(e.id, e.description)} disabled={deleting === e.id} className="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50">
                        {deleting === e.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-900">{editing ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <DateInput value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} required />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. AC servicing – Unit 3" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount</label>
                  <input className="input" type="number" step="0.001" min="0.001" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {properties.length > 0 && (
                <div>
                  <label className="label">Property <span className="text-slate-400 font-normal">(optional)</span></label>
                  <select className="input" value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}>
                    <option value="">Not property-specific</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional details..." />
              </div>
              {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : editing ? 'Save Changes' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
