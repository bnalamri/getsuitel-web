'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'

export default function RevokeButton({ inviteId }: { inviteId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function revoke() {
    if (!confirm('Revoke this invitation?')) return
    setLoading(true)
    await fetch('/api/admin/invitations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={revoke}
      disabled={loading}
      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={12} className="animate-spin"/> : <X size={12}/>}
      Revoke
    </button>
  )
}
