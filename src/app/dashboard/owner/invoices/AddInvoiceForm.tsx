'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2 } from 'lucide-react'
import DateInput from '@/components/DateInput'

type Contract = { unit_id: string; status: string }
type Tenant = { id: string; full_name: string; email?: string; contracts?: Contract[] }
type Unit = { id: string; unit_number: string; properties: { name: string } | null }

function activeUnitForTenant(tenant: Tenant | undefined, units: Unit[]): string {
  if (!tenant?.contracts) return units[0]?.id ?? ''
  const active = tenant.contracts.find(c => c.status === 'active')
  return active?.unit_id ?? units[0]?.id ?? ''
}

export default function AddInvoiceForm({ orgId, tenants, units }: { orgId: string; tenants: Tenant[]; units: Unit[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const firstTenant = tenants[0]
  const initialForm = {
    tenant_id: firstTenant?.id ?? '',
    unit_id: activeUnitForTenant(firstTenant, units),
    type: 'rent', amount: '', currency: 'OMR', due_date: today, status: 'sent', notes: '',
  }
  const [form, setForm] = useState(initialForm)

  function freshForm() {
    const t = tenants[0]
    return { tenant_id: t?.id ?? '', unit_id: activeUnitForTenant(t, units), type: 'rent', amount: '', currency: 'OMR', due_date: new Date().toISOString().split('T')[0], status: 'sent', notes: '' }
  }

  function handleOpen() { setForm(freshForm()); setError(''); setOpen(true) }
  function closeAndReset() { setError(''); setOpen(false) }

  function handleTenantChange(tenant_id: string) {
    const tenant = tenants.find(t => t.id === tenant_id)
    const unit_id = activeUnitForTenant(tenant, units)
    setForm(f => ({ ...f, tenant_id, unit_id }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: form.tenant_id,
        unit_id: form.unit_id,
        type: form.type,
        amount: Number(form.amount),
        currency: form.currency,
        due_date: form.due_date,
        status: form.status,
        notes: form.notes || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to create invoice'); setLoading(false); return }

    // Send email to tenant
    const tenant = tenants.find(t => t.id === form.tenant_id)
    if (tenant?.email && form.status !== 'draft') {
      await fetch('/api/email/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: tenant.email,
          tenantName: tenant.full_name,
          amount: form.amount,
          currency: form.currency,
          dueDate: form.due_date,
          type: form.type,
          status: form.status,
        }),
      })
    }

    closeAndReset()
    router.refresh()
    setLoading(false)
  }

  if (!open) return (
    <button onClick={handleOpen} className="btn-primary flex items-center gap-2">
      <Plus size={16} /> Create Invoice
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-900">Create Invoice</h2>
          <button onClick={() => closeAndReset()} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div><label className="label">Tenant</label>
            <select className="input" required value={form.tenant_id} onChange={e => handleTenantChange(e.target.value)}>
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
                <option value="rent">Rent</option><option value="deposit">Deposit</option>
                <option value="maintenance">Maintenance</option><option value="other">Other</option>
              </select>
            </div>
            <div><label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount</label><input className="input" type="number" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="500" /></div>
            <div><label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option>OMR</option><option>USD</option><option>AED</option><option>SAR</option>
              </select>
            </div>
          </div>
          <div><label className="label">Due Date</label><DateInput value={form.due_date} onChange={v => setForm(f => ({ ...f, due_date: v }))} required /></div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => closeAndReset()} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
