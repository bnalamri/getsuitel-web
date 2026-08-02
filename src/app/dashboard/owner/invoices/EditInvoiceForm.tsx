'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2, Paperclip, FileImage } from 'lucide-react'
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
  payment_slip_url?: string | null
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
  const [slip, setSlip] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
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

    let payment_slip_url: string | undefined
    if (slip) {
      setUploading(true)
      const fd = new FormData()
      fd.append('file', slip)
      fd.append('invoiceId', invoice.id)
      const upRes  = await fetch('/api/invoices/upload-slip', { method: 'POST', body: fd })
      const upJson = await upRes.json()
      setUploading(false)
      if (!upRes.ok) { setError(upJson.error ?? 'Upload failed'); setLoading(false); return }
      payment_slip_url = upJson.url
    }

    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount), ...(payment_slip_url ? { payment_slip_url } : {}) }),
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
            paidDate: form.status === 'paid' ? invoice.paid_date ?? null : null,
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

  function handleClose() { setOpen(false); setSlip(null); setError('') }

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
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
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

          {/* Payment slip */}
          <div>
            <label className="label">Payment Slip</label>
            {invoice.payment_slip_url && !slip && (
              <div className="flex items-center gap-2 mb-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                <Paperclip size={13} className="text-emerald-600 shrink-0" />
                <a href={invoice.payment_slip_url} target="_blank" rel="noopener noreferrer"
                  className="text-emerald-700 font-medium hover:underline flex-1 truncate">
                  View existing slip
                </a>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="text-xs text-slate-500 hover:text-slate-700">Replace</button>
              </div>
            )}
            {slip ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <FileImage size={14} className="text-slate-400 shrink-0" />
                <span className="text-sm text-slate-700 truncate flex-1">{slip.name}</span>
                <button type="button" onClick={() => { setSlip(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="text-slate-400 hover:text-red-500"><X size={13} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition-colors">
                <Paperclip size={13} />
                {invoice.payment_slip_url ? 'Replace slip…' : 'Attach payment slip (optional)'}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
              onChange={e => setSlip(e.target.files?.[0] ?? null)} />
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
            <button type="button" onClick={handleClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" />{uploading ? 'Uploading…' : 'Saving…'}</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
