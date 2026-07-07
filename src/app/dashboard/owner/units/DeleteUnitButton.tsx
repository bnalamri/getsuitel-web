'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteUnitButton({ unitId, unitNumber, occupied }: {
  unitId: string
  unitNumber: string
  occupied: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleDelete() {
    setLoading(true); setError('')
    const res = await fetch('/api/units', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: unitId }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to delete'); setConfirming(false); return }
    router.refresh()
  }

  if (occupied) return (
    <span title="Cannot delete — unit has an active contract">
      <Trash2 size={14} className="text-slate-200 cursor-not-allowed" />
    </span>
  )

  if (confirming) return (
    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
      <span className="text-xs text-red-700 font-medium">Delete Unit {unitNumber}?</span>
      <button onClick={handleDelete} disabled={loading} className="text-xs font-bold text-red-600 hover:text-red-800">
        {loading ? <Loader2 size={12} className="animate-spin" /> : 'Yes'}
      </button>
      <button onClick={() => setConfirming(false)} className="text-xs text-slate-500 hover:text-slate-700">No</button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      title="Delete unit"
    >
      <Trash2 size={14} />
    </button>
  )
}
