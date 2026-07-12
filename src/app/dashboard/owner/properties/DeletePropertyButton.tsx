'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeletePropertyButton({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Delete "${propertyName}"? This cannot be undone.`)) return
    setLoading(true)
    const res = await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { alert(json.error ?? 'Failed to delete property'); return }
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 bg-white px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
      title="Delete property"
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Delete
    </button>
  )
}
