'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2, X } from 'lucide-react'

interface Props {
  orgId: string
  currentName: string
  currentNameAr?: string | null
}

export default function EditOrgForm({ orgId, currentName, currentNameAr }: Props) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [name, setName]       = useState(currentName)
  const [nameAr, setNameAr]   = useState(currentNameAr ?? '')
  const router = useRouter()

  function resetAndClose() {
    setName(currentName)
    setNameAr(currentNameAr ?? '')
    setError('')
    setOpen(false)
  }

  async function handleSave() {
    setError('')
    if (!name.trim()) { setError('Organization name is required.'); return }
    setLoading(true)
    const res = await fetch('/api/admin/org-details', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, name: name.trim(), nameAr: nameAr.trim() || null }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error || 'Failed to update.'); return }
    setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5"
      title="Edit organization details"
    >
      <Pencil size={13} /> Edit Org
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900">Edit Organization</h2>
            <p className="text-xs text-slate-400 mt-0.5">Update name details</p>
          </div>
          <button onClick={resetAndClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="label">Organization Name (EN)</label>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Organization name"
            />
          </div>
          <div>
            <label className="label">Organization Name (AR)</label>
            <input
              className="input text-right"
              dir="rtl"
              value={nameAr}
              onChange={e => setNameAr(e.target.value)}
              placeholder="اسم المنظمة"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={resetAndClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
