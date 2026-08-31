'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2 } from 'lucide-react'

export default function GenerateBillingButton({ currentMonth }: { currentMonth: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const displayMonth = new Date(currentMonth).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

  async function generate() {
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/hq/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: currentMonth }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate billing')
        return
      }
      setMessage(`Generated ${data.generated} billing record(s) for ${displayMonth}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        Generate {displayMonth}
      </button>
      {message && <p className="text-xs text-green-600">{message}</p>}
      {error   && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
