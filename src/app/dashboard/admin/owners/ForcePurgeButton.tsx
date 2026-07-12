'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle, X } from 'lucide-react'

export default function ForcePurgeButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [confirm, setConfirm] = useState('')
  const router = useRouter()

  async function handlePurge() {
    if (confirm !== orgName) { setError('Organization name does not match.'); return }
    setError('')
    setLoading(true)
    const res = await fetch('/api/admin/purge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error || 'Purge failed.'); return }
    setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
      title="Permanently delete all org data"
    >
      <Trash2 size={13} /> Force Purge
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-red-100 bg-red-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            <h2 className="font-bold text-red-900">Force Purge</h2>
          </div>
          <button onClick={() => { setOpen(false); setConfirm(''); setError('') }} className="text-red-400 hover:text-red-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm text-slate-700 space-y-2">
            <p>This will <strong className="text-red-700">permanently delete</strong> all data for:</p>
            <p className="font-bold text-slate-900 bg-slate-100 px-3 py-2 rounded-lg">{orgName}</p>
            <p className="text-xs text-slate-500">Properties, units, tenants, contracts, invoices, maintenance records and the organization itself will all be deleted. This cannot be undone.</p>
          </div>

          <div>
            <label className="label text-red-700">Type the organization name to confirm</label>
            <input
              className="input border-red-300 focus:ring-red-400"
              placeholder={orgName}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={() => { setOpen(false); setConfirm(''); setError('') }} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handlePurge}
              disabled={loading || confirm !== orgName}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Purge Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
