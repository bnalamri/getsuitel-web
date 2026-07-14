'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Bell } from 'lucide-react'

type Org = { id: string; name: string }

export default function AdminNoticeForm({ orgs }: { orgs: Org[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetOrgId, setTargetOrgId] = useState<string>('all')
  const router = useRouter()

  function reset() {
    setTitle('')
    setBody('')
    setTargetOrgId('all')
    setError('')
    setOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) { setError('Title and body are required'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        targetOrgId: targetOrgId === 'all' ? null : targetOrgId,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to send notice'); setLoading(false); return }
    reset()
    router.refresh()
    setLoading(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
      <Plus size={16} /> Send Notice
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-navy-700" />
            <h2 className="font-bold text-slate-900">Send Notice to Owners</h2>
          </div>
          <button onClick={reset} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Recipient */}
          <div>
            <label className="label">Send to</label>
            <select className="input" value={targetOrgId} onChange={e => setTargetOrgId(e.target.value)}>
              <option value="all">All Owners (broadcast)</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="label">Notice Title</label>
            <input
              className="input"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Platform Update — July 2026"
            />
          </div>

          {/* Body */}
          <div>
            <label className="label">Message</label>
            <textarea
              className="input font-mono text-xs leading-relaxed"
              rows={10}
              required
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your notice here..."
            />
          </div>

          {targetOrgId === 'all' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              This notice will be emailed to <strong>all active owners</strong> and appear in every owner&apos;s dashboard.
            </div>
          )}

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={reset} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Send Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
