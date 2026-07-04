'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, Receipt } from 'lucide-react'

export default function SubmitChargeForm({
  orderId, agreedAmount, finalAmount, invoicePaid,
}: {
  orderId: string
  agreedAmount: number | null
  finalAmount: number | null
  invoicePaid: boolean
}) {
  const initialAmount = finalAmount != null
    ? String(finalAmount)
    : agreedAmount != null ? String(agreedAmount) : ''

  const [amount, setAmount] = useState(initialAmount)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(finalAmount != null)
  const router = useRouter()

  if (invoicePaid) {
    return (
      <div className="card p-5 border border-green-200 bg-green-50">
        <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
          <CheckCircle size={16} /> Payment received from property manager
        </div>
        {finalAmount != null && (
          <div className="text-sm text-green-600 mt-1">
            OMR {parseFloat(String(finalAmount)).toFixed(3)}
          </div>
        )}
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="card p-5 border border-blue-200 bg-blue-50">
        <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
          <CheckCircle size={16} /> Invoice submitted — awaiting payment
        </div>
        <div className="text-sm text-blue-600 mt-1">
          OMR {parseFloat(amount || '0').toFixed(3)} · Property manager has been notified by email
        </div>
      </div>
    )
  }

  async function submit() {
    if (!amount || parseFloat(amount) <= 0) return
    setLoading(true)
    await fetch('/api/maintenance/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: orderId,
        finalAmount: parseFloat(amount),
        chargeNotes: notes || null,
      }),
    })
    setLoading(false)
    setSubmitted(true)
    router.refresh()
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Receipt size={16} className="text-amber-600" />
        </div>
        <div>
          <div className="font-semibold text-slate-900 text-sm">Submit Service Charge</div>
          {agreedAmount != null && (
            <div className="text-xs text-slate-400">
              Agreed estimate: OMR {parseFloat(String(agreedAmount)).toFixed(3)}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Final Amount (OMR)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.000"
            min="0"
            step="0.001"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Parts used, additional work details..."
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
          />
        </div>
        <button
          onClick={submit}
          disabled={loading || !amount || parseFloat(amount) <= 0}
          className="w-full bg-[#1B3A6B] hover:bg-[#162f59] text-white text-sm font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Send Invoice to Manager'}
        </button>
      </div>
    </div>
  )
}
