'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteChequeButton({ chequeId, chequeNumber }: { chequeId: string; chequeNumber: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/payments/cheques/${chequeId}`, { method: 'DELETE' })
    setLoading(false)
    setConfirming(false)
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500 mr-1">Delete #{chequeNumber}?</span>
        <button onClick={handleDelete} disabled={loading}
          className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg font-medium">
          {loading ? <Loader2 size={11} className="animate-spin" /> : 'Yes'}
        </button>
        <button onClick={() => setConfirming(false)}
          className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg border border-slate-200">
          No
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirming(true)}
      className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
      title="Delete cheque">
      <Trash2 size={14} />
    </button>
  )
}
