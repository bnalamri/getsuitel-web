'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function ActivateContractButton({ contractId, unitId }: { contractId: string; unitId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function activate() {
    if (!confirm('Activate this contract? The unit will be marked as occupied.')) return
    setLoading(true)
    await fetch('/api/contracts/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId, unitId }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button onClick={activate} disabled={loading}
      className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
      {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
      Activate
    </button>
  )
}
