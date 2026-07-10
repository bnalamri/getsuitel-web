'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteTenantButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleDelete() {
    setLoading(true); setError('')
    const res = await fetch('/api/tenants', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to delete tenant'); return }
    setConfirming(false)
    router.refresh()
  }

  if (confirming) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="font-bold text-slate-900">Delete Tenant</h2>
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-medium">{name}</span>? This cannot be undone.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button onClick={() => { setConfirming(false); setError('') }} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <><Trash2 size={14} /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      title="Delete tenant"
    >
      <Trash2 size={14} />
    </button>
  )
}
