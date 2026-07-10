'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, X } from 'lucide-react'

export default function RemovePendingButton({ userId, name }: { userId: string; name: string }) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleRemove() {
    setLoading(true)
    const res = await fetch('/api/tenants/remove-pending', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed'); setLoading(false); return }
    router.refresh()
  }

  if (confirm) return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-600">Remove <strong>{name}</strong>?</span>
      <button
        onClick={handleRemove}
        disabled={loading}
        className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : 'Yes, remove'}
      </button>
      <button onClick={() => setConfirm(false)} className="text-slate-400 hover:text-slate-600">
        <X size={14} />
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
      title="Remove account so tenant can re-register with correct email"
    >
      <Trash2 size={12} /> Remove
    </button>
  )
}
