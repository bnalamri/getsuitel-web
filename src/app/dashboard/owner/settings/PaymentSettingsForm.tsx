'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, Building2, Smartphone, Zap } from 'lucide-react'

interface Org {
  bank_account_name?: string | null
  bank_account_number?: string | null
  bank_name?: string | null
  bank_iban?: string | null
  mobile_wallet_number?: string | null
  mobile_wallet_label?: string | null
  bank_transfer_mode?: 'manual' | 'automatic' | null
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
    mobile_wallet_label:  org?.mobile_wallet_label  ?? 'Mobile Transfer',
    bank_transfer_mode:   org?.bank_transfer_mode   ?? 'manual',
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
            <Smartphone size={15}/> Mobile Transfer Details
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Number</label>
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

        {/* Manual / automatic switch */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-2">
              <Zap size={15} className="mt-0.5 text-slate-500"/>
              <div>
                <p className="text-sm font-semibold text-slate-700">Automatic Bank Transfer</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Coming soon — once a bank/PSP API is connected, this switches confirmation
                  from manual receipt review to automatic. Currently has no effect: all
                  transfers are confirmed manually either way.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.bank_transfer_mode === 'automatic'}
              onClick={() => set('bank_transfer_mode', form.bank_transfer_mode === 'automatic' ? 'manual' : 'automatic')}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                form.bank_transfer_mode === 'automatic' ? 'bg-yellow-500' : 'bg-slate-200'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.bank_transfer_mode === 'automatic' ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
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
