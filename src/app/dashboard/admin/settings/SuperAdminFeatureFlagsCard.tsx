'use client'
import { useEffect, useState } from 'react'
import { ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Lock } from 'lucide-react'

type Flag = {
  feature_key: string
  label: string
  description: string | null
  hq_ceiling: boolean          // HQ's effective setting for this branch — cannot be exceeded
  enabled_branchwide: boolean
  org_overrides: Record<string, boolean>
}
type Org = { id: string; name: string }

// Super Admin tier of the HQ → Super Admin → Owner feature-flag cascade
// (see /hq/settings Feature Flags for the HQ tier this one is capped by).
// Sees all 9 flags for their own branch; sets a branch-wide default plus
// per-organization overrides. Can never enable something HQ has switched
// off for this branch — the toggle is disabled and shows a lock instead.
export default function SuperAdminFeatureFlagsCard() {
  const [flags, setFlags]             = useState<Flag[]>([])
  const [orgs, setOrgs]               = useState<Org[]>([])
  const [loading, setLoading]         = useState(true)
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [saving, setSaving]           = useState<string | null>(null)
  const [error, setError]             = useState('')

  useEffect(() => {
    fetch('/api/superadmin/flags')
      .then(async r => {
        const d = await r.json()
        if (!r.ok) { setError(d.error ?? `Error loading flags (${r.status})`); return }
        setFlags(d.flags ?? []); setOrgs(d.organizations ?? [])
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  async function toggleBranchwide(key: string, current: boolean) {
    setSaving(key); setError('')
    const res = await fetch('/api/superadmin/flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_key: key, enabled_branchwide: !current }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error saving'); setSaving(null); return }
    setFlags(prev => prev.map(f => f.feature_key === key ? { ...f, enabled_branchwide: !current } : f))
    setSaving(null)
  }

  async function setOrgOverride(key: string, orgId: string, value: boolean | null) {
    setSaving(key + orgId); setError('')
    const res = await fetch('/api/superadmin/flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_key: key, org_id: orgId, override: value }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error saving'); setSaving(null); return }
    setFlags(prev => prev.map(f => {
      if (f.feature_key !== key) return f
      const overrides = { ...f.org_overrides }
      if (value === null) { delete overrides[orgId] } else { overrides[orgId] = value }
      return { ...f, org_overrides: overrides }
    }))
    setSaving(null)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-1">
        <ToggleRight size={16} className="text-navy-700" />
        <h3 className="font-semibold text-slate-900">Feature Flags</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">Toggle features for your branch, or override per organization. Capped by HQ's platform settings.</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg mb-3">{error}</div>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : flags.length === 0 ? (
        <p className="text-sm text-slate-400">No feature flags found.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {flags.map(f => {
            const isOpen = expanded === f.feature_key
            const overrideCount = Object.keys(f.org_overrides).length
            const lockedByHq = !f.hq_ceiling
            return (
              <div key={f.feature_key}>
                <div className="flex items-center gap-3 py-3">
                  <button
                    onClick={() => !lockedByHq && toggleBranchwide(f.feature_key, f.enabled_branchwide)}
                    disabled={lockedByHq || saving === f.feature_key}
                    className="flex-shrink-0 text-slate-400 disabled:opacity-50 transition-colors"
                    title={lockedByHq ? 'Disabled by HQ for your branch' : f.enabled_branchwide ? 'Disable for your branch' : 'Enable for your branch'}
                  >
                    {lockedByHq
                      ? <Lock className="w-5 h-5 text-slate-300" />
                      : f.enabled_branchwide
                        ? <ToggleRight className="w-6 h-6 text-green-500" />
                        : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{f.label}</p>
                    {f.description && <p className="text-xs text-slate-400 mt-0.5">{f.description}</p>}
                    {lockedByHq && <p className="text-xs text-amber-600 mt-0.5">Disabled by HQ for your branch</p>}
                  </div>
                  {overrideCount > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      {overrideCount} override{overrideCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {orgs.length > 0 && (
                    <button
                      onClick={() => setExpanded(isOpen ? null : f.feature_key)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      title="Per-organization overrides"
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {isOpen && (
                  <div className="bg-slate-50 rounded-lg mb-3 p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Organization Overrides</p>
                    {orgs.map(o => {
                      const override = f.org_overrides[o.id]
                      const isSaving = saving === f.feature_key + o.id
                      return (
                        <div key={o.id} className="flex items-center gap-3">
                          <span className="text-sm text-slate-700 flex-1 truncate">{o.name}</span>
                          <div className="flex gap-1.5 text-xs">
                            {(['Inherit', 'On', 'Off'] as const).map(opt => {
                              const val = opt === 'Inherit' ? null : opt === 'On'
                              const active =
                                (opt === 'Inherit' && override === undefined) ||
                                (opt === 'On'      && override === true)      ||
                                (opt === 'Off'     && override === false)
                              const disabled = isSaving || (opt === 'On' && lockedByHq)
                              return (
                                <button
                                  key={opt}
                                  disabled={disabled}
                                  onClick={() => setOrgOverride(f.feature_key, o.id, val)}
                                  title={opt === 'On' && lockedByHq ? 'Disabled by HQ for your branch' : undefined}
                                  className={`px-2.5 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
                                    active
                                      ? opt === 'On'  ? 'bg-green-500 text-white'
                                      : opt === 'Off' ? 'bg-red-400 text-white'
                                      : 'bg-slate-300 text-slate-700'
                                      : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                                  }`}
                                >
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
