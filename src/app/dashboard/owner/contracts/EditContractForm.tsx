'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2 } from 'lucide-react'
import DateInput from '@/components/DateInput'

type Tenant = { id: string; full_name: string }
type Unit   = { id: string; unit_number: string; properties: { name: string } | null }

type Contract = {
  id: string
  tenant_id: string
  unit_id: string
  start_date: string
  end_date: string
  rent_amount: number
  currency: string
  deposit_amount: number
  payment_day: number
  payment_method: string
  status: string
}

export default function EditContractForm({
  contract,
  tenants,
  units,
}: {
  contract: Contract
  tenants: Tenant[]
  units: Unit[]   // all units (occupied + vacant), so the current unit always appears
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    tenant_id:      contract.tenant_id,
    unit_id:        contract.unit_id,
    start_date:     contract.start_date,
    end_date:       contract.end_date,
    rent_amount:    String(contract.rent_amount),
    currency:       contract.currency,
    deposit_amount: String(contract.deposit_amount ?? 0),
    payment_day:    String(contract.payment_day ?? 1),
    payment_method: contract.payment_method ?? 'cash',
    status:         contract.status,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch(`/api/contracts/${contract.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id:      form.tenant_id,
        unit_id:        form.unit_id,
        start_date:     form.start_date,
        end_date:       form.end_date,
        rent_amount:    Number(form.rent_amount),
        currency:       form.currency,
        deposit_amount: Number(form.deposit_amount),
        payment_day:    Number(form.payment_day),
        payment_method: form.payment_method,
        status:         form.status,
        prev_unit_id:   contract.unit_id,
        prev_status:    contract.status,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to update contract'); setLoading(false); return }
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900 border border-navy-200 hover:border-navy-400 px-2.5 py-1 rounded-lg transition-colors"
    >
      <Pencil size={12} /> Edit
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-900">Edit Contract</h2>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
            <div><label className="label">Start Date</label><DateInput value={form.start_date} onChange={v => setForm(f => ({ ...f, start_date: v }))} required /></div>
            <div><label className="label">End Date</label><DateInput value={form.end_date} onChange={v => setForm(f => ({ ...f, end_date: v }))} required min={form.start_date} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rent Amount</label>
              <input className="input" type="number" required value={form.rent_amount} onChange={e => setForm(f => ({ ...f, rent_amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option>OMR</option><option>USD</option><option>AED</option><option>SAR</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Deposit</label><input className="input" type="number" value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} /></div>
            <div><label className="label">Payment Day</label><input className="input" type="number" min="1" max="28" value={form.payment_day} onChange={e => setForm(f => ({ ...f, payment_day: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Payment Method</label>
              <select className="input" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_wallet">Mobile Wallet</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
          {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
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
