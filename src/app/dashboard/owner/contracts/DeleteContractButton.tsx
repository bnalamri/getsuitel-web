'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

export default function DeleteContractButton({
  contractId,
  tenantName,
  unitNumber,
}: {
  contractId: string
  tenantName: string
  unitNumber: string
}) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/contracts/${contractId}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to delete'); setLoading(false); return }
    setConfirm(false)
    router.refresh()
  }

  if (!confirm) return (
    <button
      onClick={() => setConfirm(true)}
      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-lg transition-colors"
    >
      <Trash2 size={12} /> Delete
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Delete Contract?</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {tenantName} — Unit {unitNumber}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-5">
          This will permanently delete the contract and free the unit. Any linked invoices and cheques will also be removed. This cannot be undone.
        </p>
        {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</div>}
        <div className="flex gap-3">
          <button
            onClick={() => { setConfirm(false); setError('') }}
            className="btn-secondary flex-1"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
