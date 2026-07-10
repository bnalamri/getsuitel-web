'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'

const DURATIONS = [
  { label: '1 month',  value: 1  },
  { label: '3 months', value: 3  },
  { label: '6 months', value: 6  },
  { label: '1 year',   value: 12 },
  { label: '2 years',  value: 24 },
]

export default function MarkProofReviewedButton({
  proofId,
  orgId,
}: {
  proofId: string
  orgId: string
}) {
  const [loading, setLoading]   = useState(false)
  const [duration, setDuration] = useState(1)
  const router = useRouter()

  async function approve() {
    setLoading(true)
    await fetch('/api/subscription/proof', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: proofId,
        org_id: orgId,
        status: 'reviewed',
        duration_months: duration,
      }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={duration}
        onChange={e => setDuration(Number(e.target.value))}
        disabled={loading}
        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none"
      >
        {DURATIONS.map(d => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
      </select>
      <button
        onClick={approve}
        disabled={loading}
        className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg font-semibold whitespace-nowrap"
      >
        {loading ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle size={12}/>}
        Approve & Activate
      </button>
    </div>
  )
}
