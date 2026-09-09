'use client'
import { useState } from 'react'
import { ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react'

type Flag = { feature_key: string; label: string; description: string | null; enabled_globally: boolean; branch_overrides: Record<string, boolean> }
type Branch = { id: string; display_name: string }

const card = 'bg-white rounded-xl border border-gray-200 p-6'

// HQ tier of the HQ → Super Admin → Owner feature-flag cascade. Sets the
// global default for every flag, plus an optional per-branch override that
// caps what that branch's Super Admin can do (see /dashboard/admin/system
// for the Super Admin tier this one caps).
export default function HQFeatureFlagsClient({
  flags: initialFlags,
  branches,
  isAdmin,
}: {
  flags: Flag[]
  branches: Branch[]
  isAdmin: boolean
}) {
  const [flags, setFlags] = useState<Flag[]>(initialFlags)
  const [flagExpanded, setFlagExpanded] = useState<string | null>(null)
  const [flagSaving, setFlagSaving] = useState<string | null>(null)

  async function toggleGlobal(key: string, current: boolean) {
    setFlagSaving(key)
    await fetch('/api/hq/flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_key: key, enabled_globally: !current }),
    })
    setFlags(prev => prev.map(f => f.feature_key === key ? { ...f, enabled_globally: !current } : f))
    setFlagSaving(null)
  }

  async function setBranchOverride(key: string, branchId: string, value: boolean | null) {
    setFlagSaving(key + branchId)
    await fetch('/api/hq/flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_key: key, branch_id: branchId, override: value }),
    })
    setFlags(prev => prev.map(f => {
      if (f.feature_key !== key) return f
      const overrides = { ...f.branch_overrides }
      if (value === null) { delete overrides[branchId] } else { overrides[branchId] = value }
      return { ...f, branch_overrides: overrides }
    }))
    setFlagSaving(null)
  }

  return (
    <div className={card}>
      <div className="flex items-center gap-2 mb-4">
        <ToggleRight className="w-4 h-4 text-yellow-600" />
        <h2 className="font-semibold text-gray-900">Feature Flags</h2>
        <span className="ml-auto text-xs text-gray-400">Toggle platform features per branch</span>
      </div>
      {flags.length === 0 ? (
        <p className="text-sm text-gray-400">No feature flags found. Run the Batch G SQL migration first.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {flags.map(f => {
            const isOpen = flagExpanded === f.feature_key
            const overrideCount = Object.keys(f.branch_overrides).length
            return (
              <div key={f.feature_key}>
                <div className="flex items-center gap-3 py-3">
                  {/* Global toggle */}
                  <button
                    onClick={() => isAdmin && toggleGlobal(f.feature_key, f.enabled_globally)}
                    disabled={!isAdmin || flagSaving === f.feature_key}
                    className="flex-shrink-0 text-gray-400 disabled:opacity-50 transition-colors"
                    title={!isAdmin ? 'Only HQ Admin can change feature flags' : f.enabled_globally ? 'Disable globally' : 'Enable globally'}
                  >
                    {f.enabled_globally
                      ? <ToggleRight className="w-6 h-6 text-green-500" />
                      : <ToggleLeft  className="w-6 h-6 text-gray-300" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{f.label}</p>
                    {f.description && <p className="text-xs text-gray-400 mt-0.5">{f.description}</p>}
                  </div>
                  {overrideCount > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      {overrideCount} override{overrideCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {branches.length > 0 && (
                    <button
                      onClick={() => setFlagExpanded(isOpen ? null : f.feature_key)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Per-branch overrides"
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {/* Per-branch override panel */}
                {isOpen && (
                  <div className="bg-gray-50 rounded-lg mb-3 p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Branch Overrides</p>
                    {branches.map(b => {
                      const override = f.branch_overrides[b.id]
                      const isSaving = flagSaving === f.feature_key + b.id
                      return (
                        <div key={b.id} className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 flex-1 truncate">{b.display_name}</span>
                          <div className="flex gap-1.5 text-xs">
                            {(['Inherit', 'On', 'Off'] as const).map(opt => {
                              const val = opt === 'Inherit' ? null : opt === 'On'
                              const active =
                                (opt === 'Inherit' && override === undefined) ||
                                (opt === 'On'      && override === true)      ||
                                (opt === 'Off'     && override === false)
                              return (
                                <button
                                  key={opt}
                                  disabled={!isAdmin || isSaving}
                                  onClick={() => isAdmin && setBranchOverride(f.feature_key, b.id, val)}
                                  className={`px-2.5 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
                                    active
                                      ? opt === 'On'  ? 'bg-green-500 text-white'
                                      : opt === 'Off' ? 'bg-red-400 text-white'
                                      : 'bg-gray-300 text-gray-700'
                                      : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
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
