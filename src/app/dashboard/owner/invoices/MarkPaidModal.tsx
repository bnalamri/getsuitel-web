'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, X, Banknote, CreditCard, Smartphone, FileCheck, Paperclip, FileImage } from 'lucide-react'

const PAYMENT_METHODS = [
  { value: 'cash',             label: 'Cash',             icon: Banknote },
  { value: 'cheque',           label: 'Cheque',           icon: FileCheck },
  { value: 'bank_transfer',    label: 'Bank Transfer',    icon: CreditCard },
  { value: 'mobile_transfer',  label: 'Mobile Transfer',  icon: Smartphone },
]

type Props = {
  invoiceId: string
  tenantEmail?: string | null
  tenantName?: string | null
  amount?: number
  currency?: string
  invoiceType?: string
  dueDate?: string | null
}

export default function MarkPaidModal({
  invoiceId,
  tenantEmail,
  tenantName,
  amount,
  currency = 'OMR',
  invoiceType = 'rent',
  dueDate,
}: Props) {
  const [open, setOpen]       = useState(false)
  const [method, setMethod]   = useState('')
  const [notes, setNotes]     = useState('')
  const [slip, setSlip]       = useState<File | null>(null)
  const [notify, setNotify]   = useState(!!tenantEmail)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router  = useRouter()

  function handleClose() {
    setOpen(false); setMethod(''); setNotes(''); setSlip(null); setError('')
  }

  async function handleSubmit() {
    if (!method) { setError('Please select a payment method.'); return }
    setError(''); setLoading(true)

    let payment_slip_url: string | undefined

    if (slip) {
      setUploading(true)
      const fd = new FormData()
      fd.append('file', slip)
      fd.append('invoiceId', invoiceId)
      const res  = await fetch('/api/invoices/upload-slip', { method: 'POST', body: fd })
      const json = await res.json()
      setUploading(false)
      if (!res.ok) { setError(json.error ?? 'Upload failed'); setLoading(false); return }
      payment_slip_url = json.url
    }

    const paidDate = new Date().toISOString().split('T')[0]

    await fetch('/api/invoices/markpaid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceId,
        paid_via: method,
        notes: notes.trim() || undefined,
        payment_slip_url,
      }),
    })

    if (notify && tenantEmail) {
      await fetch('/api/email/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: tenantEmail,
          tenantName: tenantName ?? 'Tenant',
          amount,
          currency,
          dueDate,
          paidDate,
          type: invoiceType,
          status: 'paid',
          corrected: false,
        }),
      })
    }

    handleClose()
    setLoading(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-green-700 hover:text-green-900 font-medium flex items-center gap-1 whitespace-nowrap"
      >
        <CheckCircle size={12} /> Mark Paid
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Mark Invoice as Paid</h3>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Payment method picker */}
            <div>
              <label className="label mb-2">
                How was it paid? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMethod(value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      method === value
                        ? 'border-navy-600 bg-navy-50 text-navy-800'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transfer slip attachment */}
            <div>
              <label className="label mb-1.5">
                Payment Slip <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              {slip ? (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                  <FileImage size={15} className="text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-700 truncate flex-1">{slip.name}</span>
                  <button
                    type="button"
                    onClick={() => { setSlip(null); if (fileRef.current) fileRef.current.value = '' }}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                >
                  <Paperclip size={14} />
                  Attach transfer slip / receipt image
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={e => setSlip(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                className="input text-sm"
                placeholder="e.g. ref #12345, collected by Ahmed…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* Email notification checkbox */}
            {tenantEmail && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={e => setNotify(e.target.checked)}
                  className="w-4 h-4 rounded accent-navy-700"
                />
                <span className="text-sm text-slate-600">Notify tenant by email with payment confirmation</span>
              </label>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={handleClose} className="btn-secondary flex-1 text-sm">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!method || loading}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5"
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin" />{uploading ? 'Uploading…' : 'Saving…'}</>
                  : <><CheckCircle size={14} />Confirm Paid</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
