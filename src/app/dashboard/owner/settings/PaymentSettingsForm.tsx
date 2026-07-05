'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, Building2, Smartphone } from 'lucide-react'

interface Org {
  bank_account_name?: string | null
  bank_account_number?: string | null
  bank_name?: string | null
  bank_iban?: string | null
  mobile_wallet_number?: string | null
  mobile_wallet_label?: string | null
}

export default function PaymentSettingsForm({ org, orgId }: { org: Org | null; orgId: string | null }) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    bank_account_name:   org?.bank_account_name   ?? '',
    bank_account_number: org?.bank_account_number ?? '',
    bank_name:           org?.bank_name           ?? '',
    bank_iban:           org?.bank_iban           ?? '',
    mobile_wallet_number: org?.mobile_wallet_number ?? '',
    mobile_wallet_label:  org?.mobile_wallet_label  ?? 'Mobile Wallet',
  })

  function set(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) return
    setLoading(true)
    await fetch('/api/payments/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, ...form }),
    })
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  if (!orgId) {
    return (
      <div className="card p-6 opacity-60">
        <h3 className="font-semibold text-slate-900 mb-1">Payment Settings</h3>
        <p className="text-slate-500 text-sm">Create your organization first to configure payment details.</p>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-slate-900 mb-1">Payment Settings</h3>
      <p className="text-slate-500 text-sm mb-5">
        These details are shown to tenants when they pay via bank transfer or mobile wallet.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Bank details */}
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
            <Building2 size={15}/> Bank Transfer Details
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Account Name</label>
              <input className="input" placeholder="Anwar Properties LLC"
                value={form.bank_account_name} onChange={e => set('bank_account_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Account Number</label>
              <input className="input" placeholder="0123456789"
                value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} />
            </div>
            <div>
              <label className="label">Bank Name</label>
              <input className="input" placeholder="BankMuscat"
                value={form.bank_name} onChange={e => set('bank_name', e.target.value)} />
            </div>
            <div>
              <label className="label">IBAN</label>
              <input className="input" placeholder="OM91 0000 0000 0000 0000 0000"
                value={form.bank_iban} onChange={e => set('bank_iban', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Mobile wallet */}
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
            <Smartphone size={15}/> Mobile Wallet Details
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Wallet Number</label>
              <input className="input" placeholder="+968 9999 9999"
                value={form.mobile_wallet_number} onChange={e => set('mobile_wallet_number', e.target.value)} />
            </div>
            <div>
              <label className="label">Label</label>
              <input className="input" placeholder="Thawani / OmanNet / ..."
                value={form.mobile_wallet_label} onChange={e => set('mobile_wallet_label', e.target.value)} />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
          {saved ? 'Saved!' : 'Save Payment Settings'}
        </button>
      </form>
    </div>
  )
}
