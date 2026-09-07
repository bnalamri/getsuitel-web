'use client'
import { useEffect, useState } from 'react'
import { ToggleLeft, ToggleRight, Lock, ToggleRight as TitleIcon } from 'lucide-react'

type Flag = {
  feature_key: string
  label: string
  description: string | null
  ceiling: boolean   // live-computed cap from HQ + Super Admin — cannot be exceeded
  enabled: boolean
}

// Owner tier of the HQ → Super Admin → Owner feature-flag cascade. Only the
// 6 tenant-facing flags apply here — a single org-wide on/off each. Can
// never enable something HQ or the branch admin has switched off.
export default function FeatureFlagsCard() {
  const [flags, setFlags]     = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch('/api/owner/flags')
      .then(r => r.json())
      .then(d => setFlags(d.flags ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function toggle(key: string, current: boolean) {
    setSaving(key); setError('')
    const res = await fetch('/api/owner/flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_key: key, enabled: !current }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error saving'); setSaving(null); return }
    setFlags(prev => prev.map(f => f.feature_key === key ? { ...f, enabled: !current } : f))
    setSaving(null)
  }

  if (loading) return null
  if (flags.length === 0) return null

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <TitleIcon size={16} className="text-navy-700" />
        <h3 className="font-semibold text-slate-900">Feature Flags</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">Turn features on or off for your tenants.</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg mb-3">{error}</div>}

      <div className="divide-y divide-slate-100">
        {flags.map(f => {
          const locked = !f.ceiling
          return (
            <div key={f.feature_key} className="flex items-center gap-3 py-3">
              <button
                onClick={() => !locked && toggle(f.feature_key, f.enabled)}
                disabled={locked || saving === f.feature_key}
                className="flex-shrink-0 text-slate-400 disabled:opacity-50 transition-colors"
                title={locked ? 'Disabled for your branch — contact your branch administrator' : f.enabled ? 'Disable' : 'Enable'}
              >
                {locked
                  ? <Lock className="w-5 h-5 text-slate-300" />
                  : f.enabled
                    ? <ToggleRight className="w-6 h-6 text-green-500" />
                    : <ToggleLeft className="w-6 h-6 text-slate-300" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{f.label}</p>
                {f.description && <p className="text-xs text-slate-400 mt-0.5">{f.description}</p>}
                {locked && <p className="text-xs text-amber-600 mt-0.5">Disabled for your branch — contact your branch administrator</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
