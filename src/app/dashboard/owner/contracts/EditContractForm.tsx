'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2, Paperclip, CheckCircle, ExternalLink, RefreshCw, Trash2 } from 'lucide-react'
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
  municipality_agreement_url?: string | null
}

export default function EditContractForm({
  contract,
  tenants,
  units,
}: {
  contract: Contract
  tenants: Tenant[]
  units: Unit[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreementFile, setAgreementFile] = useState<File | null>(null)
  const [replacingDoc, setReplacingDoc] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [docRemoved, setDocRemoved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
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

  function handleClose() {
    setOpen(false)
    setError('')
    setAgreementFile(null)
    setReplacingDoc(false)
    setDocRemoved(false)
  }

  async function handleRemoveAgreement() {
    if (!window.confirm('Remove the Municipality Agreement from this contract?')) return
    setRemoving(true)
    const res = await fetch(`/api/contracts/${contract.id}/agreement`, { method: 'DELETE' })
    setRemoving(false)
    if (!res.ok) { const j = await res.json(); setError(j.error ?? 'Failed to remove'); return }
    setDocRemoved(true)
    setAgreementFile(null)
    setReplacingDoc(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Step 1: Update contract fields
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

    // Step 2: Upload new municipality agreement if provided
    if (agreementFile) {
      const fd = new FormData()
      fd.append('contractId', contract.id)
      fd.append('file', agreementFile)
      const upRes = await fetch('/api/contracts/upload-agreement', { method: 'POST', body: fd })
      if (!upRes.ok) {
        const upJson = await upRes.json()
        setError(`Contract updated, but document upload failed: ${upJson.error ?? 'Unknown error'}`)
        setLoading(false)
        router.refresh()
        return
      }
    }

    handleClose()
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

  const hasExistingDoc = !!contract.municipality_agreement_url && !docRemoved

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-900">Edit Contract</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
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
                <option>OMR</option><option>SAR</option><option>AED</option><option>KWD</option>
                <option>QAR</option><option>BHD</option><option>USD</option><option>GBP</option><option>EUR</option>
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

          {/* Municipality Agreement */}
          <div className="pt-1 border-t border-slate-100">
            <label className="label">Municipality Agreement</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' }}
              onChange={e => { setAgreementFile(e.target.files?.[0] ?? null); setReplacingDoc(true) }}
            />
            {hasExistingDoc && !replacingDoc && !docRemoved ? (
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={contract.municipality_agreement_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 hover:text-navy-900 bg-navy-50 hover:bg-navy-100 border border-navy-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <ExternalLink size={12} /> View Agreement
                </a>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <RefreshCw size={12} /> Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemoveAgreement}
                  disabled={removing}
                  className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Remove
                </button>
              </div>
            ) : agreementFile ? (
              <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                <span className="text-green-800 truncate flex-1">{agreementFile.name}</span>
                <button type="button" onClick={() => { setAgreementFile(null); setReplacingDoc(false); if (fileRef.current) fileRef.current.value = '' }}
                  className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 text-sm text-navy-700 hover:text-navy-900 border border-dashed border-slate-300 hover:border-navy-400 rounded-lg px-4 py-2.5 w-full transition-colors"
              >
                <Paperclip size={14} /> Attach Municipality Agreement
              </button>
            )}
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
