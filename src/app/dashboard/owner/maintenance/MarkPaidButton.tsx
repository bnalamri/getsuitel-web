'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle } from 'lucide-react'

export default function MarkPaidButton({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function markPaid() {
    setLoading(true)
    await fetch('/api/maintenance/markpaid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    })
    setLoading(false)
    setDone(true)
    router.refresh()
  }

  if (done) {
    return (
      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
        <CheckCircle size={11} /> Marked paid
      </span>
    )
  }

  return (
    <button
      onClick={markPaid}
      disabled={loading}
      className="text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg px-2.5 py-1 flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : 'Mark as Paid'}
    </button>
  )
}
