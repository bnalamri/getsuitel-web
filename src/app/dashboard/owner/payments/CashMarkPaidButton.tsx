'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, Loader2 } from 'lucide-react'

export default function CashMarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const router = useRouter()

  async function markPaid() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/payments/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: invoiceId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed')
        setLoading(false)
        return
      }
      router.refresh()
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1 rounded-lg font-semibold"
      >
        <Banknote size={13}/> Cash Paid
      </button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500">Confirm?</span>
        <button
          className="text-xs bg-emerald-600 text-white hover:bg-emerald-700 px-2 py-1 rounded font-semibold disabled:opacity-50"
          onClick={markPaid}
          disabled={loading}
        >
          {loading ? <Loader2 size={11} className="animate-spin inline" /> : 'Yes'}
        </button>
        <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => { setConfirm(false); setError(null) }}>No</button>
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
