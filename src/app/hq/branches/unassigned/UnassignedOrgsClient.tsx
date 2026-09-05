'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Loader2, CheckSquare, Square, Building2 } from 'lucide-react'

type Org = {
  id: string; name: string; subscription_status: string; subscription_plan: string | null
  country: string | null; created_at: string
}
type Branch = { id: string; display_name: string; city: string | null; region: string | null; status: string }

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  trialing:  'bg-blue-100 text-blue-700',
  past_due:  'bg-red-100 text-red-700',
  canceled:  'bg-gray-100 text-gray-500',
}

export default function UnassignedOrgsClient({ orgs: initialOrgs, branches }: { orgs: Org[]; branches: Branch[] }) {
  const [orgs, setOrgs]         = useState(initialOrgs)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [branchId, setBranchId] = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [msg, setMsg]           = useState('')

  function toggle(id: string) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected(s => s.size === orgs.length ? new Set() : new Set(orgs.map(o => o.id)))
  }

  async function handleAssign() {
    if (selected.size === 0) { setError('Select at least one organisation'); return }
    if (!branchId) { setError('Select a destination branch'); return }
    setSaving(true); setError(''); setMsg('')
    try {
      const res = await fetch('/api/hq/organizations/unassigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgIds: Array.from(selected), branchId }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Assignment failed'); return }
      setOrgs(o => o.filter(org => !selected.has(org.id)))
      setMsg(`${json.assigned} organisation(s) assigned.`)
      setSelected(new Set())
    } catch {
      setError('Assignment failed — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <Link href="/hq/branches" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" /> Back to Branches
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Unassigned Organisations</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Organisations created before branch assignment was wired into sign-up. Select rows and assign them
          to a branch — this is a one-time data-repair tool, not part of normal onboarding.
        </p>
      </div>

      {orgs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">All organisations are assigned to a branch.</p>
        </div>
      ) : (
        <>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{orgs.length} organisation(s) have no branch assigned — they're invisible to branch-scoped health, limits, and billing until fixed.</span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <button onClick={toggleAll} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                {selected.size === orgs.length ? <CheckSquare className="w-4 h-4 text-yellow-600" /> : <Square className="w-4 h-4" />}
                {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={branchId}
                  onChange={e => setBranchId(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Assign to branch…</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {[b.city, b.region].filter(Boolean).join(', ') || b.display_name}
                      {b.status !== 'active' ? ` (${b.status.replace('_', ' ')})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssign}
                  disabled={saving || selected.size === 0 || !branchId}
                  className="flex items-center gap-2 px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Assign Selected
                </button>
              </div>
            </div>

            {(error || msg) && (
              <div className={`px-5 py-2 text-sm ${error ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'}`}>
                {error || msg}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left w-10"></th>
                    <th className="px-5 py-3 text-left">Organisation</th>
                    <th className="px-5 py-3 text-left">Country</th>
                    <th className="px-5 py-3 text-left">Plan</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orgs.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggle(o.id)}>
                      <td className="px-5 py-3">
                        {selected.has(o.id) ? <CheckSquare className="w-4 h-4 text-yellow-600" /> : <Square className="w-4 h-4 text-gray-300" />}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">{o.name}</td>
                      <td className="px-5 py-3 text-gray-600">{o.country ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-600 capitalize">{o.subscription_plan ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[o.subscription_status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {o.subscription_status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
