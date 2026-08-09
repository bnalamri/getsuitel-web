'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, X } from 'lucide-react'

export default function CompleteJobModal({
  orderId, orderTitle, agreedAmount, agreedPayer,
}: {
  orderId: string
  orderTitle: string
  agreedAmount: number | null
  agreedPayer: string | null
}) {
  const [open, setOpen]         = useState(false)
  const [amount, setAmount]     = useState(agreedAmount != null ? String(agreedAmount) : '')
  const [payer, setPayer]       = useState<'tenant' | 'owner'>(
    agreedPayer === 'owner' ? 'owner' : 'tenant'
  )
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function submit() {
    setLoading(true)
    const chargeVal = amount && parseFloat(amount) > 0 ? parseFloat(amount) : null

    // 1. Mark completed (+ charge fields if provided)
    await fetch('/api/maintenance/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        nextStatus: 'completed',
        chargeAmount: chargeVal,
        chargePayer:  chargeVal ? payer : null,
        chargeNotes:  notes.trim() || null,
      }),
    })

    // 2. If owner-billed, send invoice email
    if (chargeVal && payer === 'owner') {
      await fetch('/api/maintenance/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId:   orderId,
          finalAmount: chargeVal,
          chargeNotes: notes.trim() || null,
        }),
      })
    }

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors whitespace-nowrap"
      >
        <CheckCircle size={14} /> Mark Complete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Complete Job + Add Charge</h3>
                <p className="text-sm text-slate-500 mt-0.5">{orderTitle}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 mt-0.5">
                <X size={18} />
              </button>
            </div>

            {/* Charge amount */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Charge Amount (optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">OMR</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.000"
                  min="0"
                  step="0.001"
                  className="w-full text-sm border border-slate-200 rounded-lg pl-12 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-400"
                />
              </div>
              {agreedAmount != null && (
                <p className="text-xs text-slate-400 mt-1">Agreed estimate: OMR {Number(agreedAmount).toFixed(3)}</p>
              )}
            </div>

            {/* Who pays */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Who Pays?</label>
              <div className="grid grid-cols-2 gap-2">
                {(['tenant', 'owner'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPayer(p)}
                    className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors capitalize ${
                      payer === p
                        ? 'bg-[#1B3A6B] border-[#1B3A6B] text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Parts used, additional work details..."
                rows={2}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-400 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : 'Mark Completed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
