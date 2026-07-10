'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Smartphone, Receipt, Copy, Check, Loader2, Send, ChevronDown, ChevronUp, Banknote, Info, Paperclip, X } from 'lucide-react'

interface OrgPayment {
  bank_account_name?: string | null
  bank_account_number?: string | null
  bank_name?: string | null
  bank_iban?: string | null
  mobile_wallet_number?: string | null
  mobile_wallet_label?: string | null
}

type Method = 'bank_transfer' | 'mobile_transfer' | 'cheque' | 'cash'

const methods: { id: Method; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'bank_transfer',   label: 'Bank Transfer',   icon: Building2,   desc: 'Transfer to owner\'s bank account' },
  { id: 'mobile_transfer', label: 'Mobile Transfer', icon: Smartphone,  desc: 'Send via mobile wallet' },
  { id: 'cheque',          label: 'Cheque',          icon: Receipt,     desc: 'Payment via post-dated cheque' },
  { id: 'cash',            label: 'Cash',            icon: Banknote,    desc: 'Pay in person to your manager' },
]

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="font-mono font-semibold text-slate-800 text-sm">{value}</div>
      </div>
      <button onClick={copy} className="text-slate-400 hover:text-slate-700 p-1">
        {copied ? <Check size={14} className="text-green-500"/> : <Copy size={14}/>}
      </button>
    </div>
  )
}

function FilePickerField({
  file, onFile, label,
}: { file: File | null; onFile: (f: File | null) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      <label className="label">{label}</label>
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={e => onFile(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
          <Paperclip size={14} className="text-emerald-600 flex-shrink-0"/>
          <span className="text-emerald-700 font-medium flex-1 truncate">{file.name}</span>
          <button onClick={() => { onFile(null); if (ref.current) ref.current.value = '' }}
            className="text-slate-400 hover:text-slate-600">
            <X size={14}/>
          </button>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          className="flex items-center gap-2 w-full border-2 border-dashed border-slate-200 rounded-lg px-3 py-3 text-sm text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-colors"
        >
          <Paperclip size={14}/>
          Attach transaction slip (image or PDF)
        </button>
      )}
    </div>
  )
}

export default function PaymentPanel({
  invoiceId, tenantId, orgId, amount, currency, org,
}: {
  invoiceId: string
  tenantId: string
  orgId: string
  amount: number
  currency: string
  org: OrgPayment | null
}) {
  const [open, setOpen]        = useState(false)
  const [method, setMethod]    = useState<Method | null>(null)
  const [notes, setNotes]      = useState('')
  const [file, setFile]        = useState<File | null>(null)
  const [loading, setLoading]  = useState(false)
  const [submitted, setSubmit] = useState(false)
  const router = useRouter()

  async function submit() {
    if (!method || method === 'cheque' || method === 'cash') return
    setLoading(true)

    let body: BodyInit
    const headers: Record<string, string> = {}

    if (file) {
      // Send as FormData so server can upload file with admin client (bypasses storage RLS)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('invoice_id', invoiceId)
      fd.append('tenant_id', tenantId)
      fd.append('organization_id', orgId)
      fd.append('method', method)
      fd.append('amount', String(amount))
      if (notes) fd.append('notes', notes)
      body = fd
    } else {
      body = JSON.stringify({
        invoice_id: invoiceId,
        tenant_id: tenantId,
        organization_id: orgId,
        method,
        notes: notes || undefined,
        amount,
      })
      headers['Content-Type'] = 'application/json'
    }

    await fetch('/api/payments/receipts', { method: 'POST', headers, body })
    setLoading(false)
    setSubmit(true)
    setTimeout(() => router.refresh(), 1500)
  }

  if (submitted) {
    return (
      <div className="border-t border-slate-100 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
        <Check size={14}/> Receipt submitted — your manager will confirm shortly.
      </div>
    )
  }

  return (
    <div className="border-t border-slate-100">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-navy-700 hover:bg-slate-50"
      >
        <span>Pay This Invoice</span>
        {open ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Method selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {methods.map(m => {
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition-all
                    ${method === m.id ? 'border-navy-700 bg-navy-50 text-navy-800' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <Icon size={18}/>
                  {m.label}
                </button>
              )
            })}
          </div>

          {method === 'bank_transfer' && (
            <div className="space-y-2">
              {org?.bank_account_name   && <CopyField label="Account Name"   value={org.bank_account_name} />}
              {org?.bank_account_number && <CopyField label="Account Number" value={org.bank_account_number} />}
              {org?.bank_name           && <CopyField label="Bank"           value={org.bank_name} />}
              {org?.bank_iban           && <CopyField label="IBAN"           value={org.bank_iban} />}
              {!org?.bank_account_number && (
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Info size={12}/> Bank details not configured yet. Contact your property manager.
                </div>
              )}
              <div>
                <label className="label">Transfer amount: <strong>{Number(amount).toLocaleString()} {currency}</strong></label>
                <textarea className="input mt-1" rows={2} placeholder="Add transaction reference or note (optional)"
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <FilePickerField file={file} onFile={setFile} label="Transaction Slip (optional)" />
              <button onClick={submit} disabled={loading || !org?.bank_account_number}
                className="btn-primary flex items-center gap-2 text-sm w-full justify-center">
                {loading ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                Notify Manager — Receipt Submitted
              </button>
            </div>
          )}

          {method === 'mobile_transfer' && (
            <div className="space-y-2">
              {org?.mobile_wallet_number && (
                <CopyField label={org.mobile_wallet_label ?? 'Mobile Wallet'} value={org.mobile_wallet_number} />
              )}
              {!org?.mobile_wallet_number && (
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Info size={12}/> Wallet number not configured yet. Contact your property manager.
                </div>
              )}
              <div>
                <label className="label">Send: <strong>{Number(amount).toLocaleString()} {currency}</strong></label>
                <textarea className="input mt-1" rows={2} placeholder="Add transaction ID or note (optional)"
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <FilePickerField file={file} onFile={setFile} label="Transaction Slip (optional)" />
              <button onClick={submit} disabled={loading || !org?.mobile_wallet_number}
                className="btn-primary flex items-center gap-2 text-sm w-full justify-center">
                {loading ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                Notify Manager — Receipt Submitted
              </button>
            </div>
          )}

          {method === 'cheque' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              <div className="font-semibold mb-1">Post-dated Cheque</div>
              <p>Your cheque will be registered by your property manager. No action needed here — please hand your cheques directly to your manager.</p>
            </div>
          )}

          {method === 'cash' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
              <div className="font-semibold mb-1">Cash Payment</div>
              <p>Pay in person to your property manager. They will mark this invoice as paid once they receive the cash.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
