'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2 } from 'lucide-react'
import DateInput from '@/components/DateInput'

type Contract = { unit_id: string; status: string }
type Tenant = { id: string; full_name: string; email?: string; contracts?: Contract[] }
type Unit = { id: string; unit_number: string; properties: { name: string } | null }

type Invoice = {
  id: string
  tenant_id: string
  unit_id: string
  type: string
  amount: number
  currency: string
  due_date: string
  paid_date: string | null
  status: string
  notes: string | null
}

export default function EditInvoiceForm({
  invoice,
  tenants,
  units,
}: {
  invoice: Invoice
  tenants: Tenant[]
  units: Unit[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notify, setNotify] = useState(['sent', 'paid', 'overdue'].includes(invoice.status))
  const router = useRouter()

  const [form, setForm] = useState({
    tenant_id:  invoice.tenant_id,
    unit_id:    invoice.unit_id,
    type:       invoice.type,
    amount:     String(invoice.amount),
    currency:   invoice.currency,
    due_date:   invoice.due_date,
    status:     invoice.status,
    notes:      invoice.notes ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to update invoice'); setLoading(false); return }

    if (notify) {
      const tenant = tenants.find(t => t.id === form.tenant_id)
      if (tenant?.email) {
        await fetch('/api/email/invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: tenant.email,
            tenantName: tenant.full_name,
            amount: form.amount,
            currency: form.currency,
            dueDate: form.due_date,
            paidDate: form.paid_date ?? null,
            type: form.type,
            status: form.status,
            corrected: true,
          }),
        })
      }
    }

    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      title="Edit invoice"
    >
      <Pencil size={14} />
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-900">Edit Invoice</h2>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div><label className="label">Tenant</label>
            <select className="input" required value={form.tenant_id} onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))}>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div><label className="label">Unit</label>
            <select className="input" required value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}>
              {units.map(u => <option key={u.id} value={u.id}>{u.properties?.name} — Unit {u.unit_number}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="rent">Rent</option>
                <option value="deposit">Deposit</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount</label>
              <input className="input" type="number" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div><label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option>OMR</option><option>USD</option><option>AED</option><option>SAR</option>
              </select>
            </div>
          </div>
          <div><label className="label">Due Date</label>
            <DateInput value={form.due_date} onChange={v => setForm(f => ({ ...f, due_date: v }))} required />
          </div>
          <div><label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={notify}
              onChange={e => setNotify(e.target.checked)}
              className="w-4 h-4 rounded accent-navy-700"
            />
            <span className="text-sm text-slate-600">Notify tenant by email with corrected details</span>
          </label>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
