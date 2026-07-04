'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2 } from 'lucide-react'

type Unit = { id: string; unit_number: string; properties: { name: string } | null }
type Tenant = { id: string; full_name: string }

export default function AddContractForm({ orgId, units, tenants }: { orgId: string; units: Unit[]; tenants: Tenant[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
  const [form, setForm] = useState({
    unit_id: units[0]?.id ?? '', tenant_id: tenants[0]?.id ?? '',
    start_date: today, end_date: nextYear,
    rent_amount: '', currency: 'OMR', deposit_amount: '0', payment_day: '1', status: 'draft',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_id: form.unit_id,
        tenant_id: form.tenant_id,
        start_date: form.start_date,
        end_date: form.end_date,
        rent_amount: Number(form.rent_amount),
        currency: form.currency,
        deposit_amount: Number(form.deposit_amount),
        payment_day: Number(form.payment_day),
        status: form.status,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to create contract'); setLoading(false); return }
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
      <Plus size={16} /> New Contract
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-900">New Contract</h2>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {units.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">No vacant units available. Add a unit first.</div>
          ) : null}
          {tenants.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">No tenants available. Add a tenant first.</div>
          ) : null}
          <div>
            <label className="label">Tenant</label>
            <select className="input" required value={form.tenant_id} onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))}>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Unit</label>
            <select className="input" required value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}>
              {units.map(u => <option key={u.id} value={u.id}>{u.properties?.name} — Unit {u.unit_number}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start Date</label><input className="input" type="date" required value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><label className="label">End Date</label><input className="input" type="date" required value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Rent Amount</label><input className="input" type="number" required value={form.rent_amount} onChange={e => setForm(f => ({ ...f, rent_amount: e.target.value }))} placeholder="500" /></div>
            <div><label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option>OMR</option><option>USD</option><option>AED</option><option>SAR</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Deposit</label><input className="input" type="number" value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} /></div>
            <div><label className="label">Payment Day</label><input className="input" type="number" min="1" max="28" value={form.payment_day} onChange={e => setForm(f => ({ ...f, payment_day: e.target.value }))} /></div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="draft">Draft</option>
              <option value="active">Active (marks unit as occupied)</option>
            </select>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading || units.length === 0 || tenants.length === 0} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
