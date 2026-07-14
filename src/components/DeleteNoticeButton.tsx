'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteNoticeButton({
  noticeId,
  apiPath,
}: {
  noticeId: string
  apiPath: string // e.g. '/api/notices' or '/api/admin/notices'
}) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`${apiPath}/${noticeId}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      const json = await res.json().catch(() => ({}))
      alert(json.error ?? 'Failed to delete notice')
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">Delete?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs font-medium text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : 'Yes'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="Delete notice"
      className="flex items-center gap-1.5 text-xs text-red-500 font-medium hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
    >
      <Trash2 size={13} />
      Delete
    </button>
  )
}
