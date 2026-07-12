'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sliders, Loader2, X, Building2, Home, Users } from 'lucide-react'

interface Props {
  orgId: string
  orgName: string
  currentMaxProperties: number
  currentMaxUnits: number
  currentMaxTenants: number
  usedProperties: number
  usedUnits: number
  usedTenants: number
}

export default function EditLimitsForm({
  orgId, orgName,
  currentMaxProperties, currentMaxUnits, currentMaxTenants,
  usedProperties, usedUnits, usedTenants,
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [maxProperties, setMaxProperties] = useState(String(currentMaxProperties))
  const [maxUnits, setMaxUnits] = useState(String(currentMaxUnits))
  const [maxTenants, setMaxTenants] = useState(String(currentMaxTenants))
  const router = useRouter()

  function resetAndClose() {
    setMaxProperties(String(currentMaxProperties))
    setMaxUnits(String(currentMaxUnits))
    setMaxTenants(String(currentMaxTenants))
    setError('')
    setOpen(false)
  }

  async function handleSave() {
    setError('')
    const p = Number(maxProperties)
    const u = Number(maxUnits)
    const t = Number(maxTenants)

    if (p < usedProperties) {
      setError(`Max properties cannot be less than current usage (${usedProperties}).`)
      return
    }
    if (u < usedUnits) {
      setError(`Max units cannot be less than current usage (${usedUnits}).`)
      return
    }
    if (t < usedTenants) {
      setError(`Max tenants cannot be less than current usage (${usedTenants}).`)
      return
    }

    setLoading(true)
    const res = await fetch('/api/admin/org-limits', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, maxProperties: p, maxUnits: u, maxTenants: t }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error || 'Failed to update limits.')
      return
    }

    setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5"
      title="Edit plan limits"
    >
      <Sliders size={13} /> Edit Limits
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900">Edit Limits</h2>
            <p className="text-xs text-slate-400 mt-0.5">{orgName}</p>
          </div>
          <button onClick={resetAndClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Properties */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Building2 size={12} className="text-slate-400" /> Max Properties
              <span className="ml-auto text-xs text-slate-400 font-normal">{usedProperties} in use</span>
            </label>
            <input
              className="input"
              type="number"
              min={usedProperties}
              value={maxProperties}
              onChange={e => setMaxProperties(e.target.value)}
            />
          </div>

          {/* Units */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Home size={12} className="text-slate-400" /> Max Units
              <span className="ml-auto text-xs text-slate-400 font-normal">{usedUnits} in use</span>
            </label>
            <input
              className="input"
              type="number"
              min={usedUnits}
              value={maxUnits}
              onChange={e => setMaxUnits(e.target.value)}
            />
          </div>

          {/* Tenants */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Users size={12} className="text-slate-400" /> Max Tenants
              <span className="ml-auto text-xs text-slate-400 font-normal">{usedTenants} in use</span>
            </label>
            <input
              className="input"
              type="number"
              min={usedTenants}
              value={maxTenants}
              onChange={e => setMaxTenants(e.target.value)}
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
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Limits'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
