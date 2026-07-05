'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function ConfirmReceiptButton({
  receiptId,
  action,
}: {
  receiptId: string
  action: 'confirmed' | 'rejected'
}) {
  const [loading, setLoading]           = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReason, setShowReason]     = useState(false)
  const router = useRouter()

  async function submit(reason?: string) {
    setLoading(true)
    await fetch(`/api/payments/receipts/${receiptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: action,
        ...(reason ? { rejection_reason: reason } : {}),
      }),
    })
    setLoading(false)
    router.refresh()
  }

  if (action === 'rejected') {
    if (showReason) {
      return (
        <div className="flex flex-col gap-1 items-end">
          <input
            className="input text-xs w-44"
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
          <div className="flex gap-1">
            <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setShowReason(false)}>Cancel</button>
            <button
              className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-0.5 rounded font-semibold"
              onClick={() => submit(rejectReason)}
              disabled={loading}
            >
              {loading ? <Loader2 size={11} className="animate-spin inline" /> : 'Reject'}
            </button>
          </div>
        </div>
      )
    }
    return (
      <button
        onClick={() => setShowReason(true)}
        className="flex items-center gap-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded-lg font-semibold"
      >
        <XCircle size={13}/> Reject
      </button>
    )
  }

  return (
    <button
      onClick={() => submit()}
      disabled={loading}
      className="flex items-center gap-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded-lg font-semibold"
    >
      {loading ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle size={13}/>}
      Confirm
    </button>
  )
}
