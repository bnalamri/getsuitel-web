'use client'
import { useState } from 'react'
import { Building2, Plus, Search, Edit2, Mail } from 'lucide-react'
import BranchFormModal from './BranchFormModal'
import InviteCodeDialog from '@/components/hq/InviteCodeDialog'
import OmrSymbol from '@/components/ui/OmrSymbol'

type Branch = {
  id: string; name: string; display_name: string; region: string | null; city: string | null
  status: string; license_fee_omr: number; revenue_share_pct: number; logo_url: string | null
  created_at: string; superadmin_id: string | null; org_count: number
  profiles: { full_name: string | null; email: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  archived:  'bg-gray-100 text-gray-500',
}

export default function BranchesClient({ branches }: { branches: Branch[] }) {
  const [q, setQ]               = useState('')
  const [filter, setFilter]     = useState<'all'|'active'|'suspended'|'archived'>('all')
  const [showModal, setModal]   = useState(false)
  const [editing, setEditing]   = useState<Branch | null>(null)
  const [inviteBranch, setInvite] = useState<{ id: string; name: string } | null>(null)

  const visible = branches.filter(b => {
    const matchQ = !q || b.display_name.toLowerCase().includes(q.toLowerCase()) ||
                   (b.city ?? '').toLowerCase().includes(q.toLowerCase())
    const matchF = filter === 'all' || b.status === filter
    return matchQ && matchF
  })

  function openCreate() { setEditing(null); setModal(true) }
  function openEdit(b: Branch) { setEditing(b); setModal(true) }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-sm text-gray-500">{branches.length} branches registered</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Branch
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search branches…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
        <div className="flex gap-2">
          {(['all','active','suspended','archived'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === s ? 'bg-yellow-500 text-gray-900' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Branch</th>
                <th className="px-5 py-3 text-left">Superadmin</th>
                <th className="px-5 py-3 text-left">Location</th>
                <th className="px-5 py-3 text-center">Orgs</th>
                <th className="px-5 py-3 text-right"><span className="flex items-center justify-end gap-1">License <OmrSymbol variant="dark" size={13} /></span></th>
                <th className="px-5 py-3 text-right">Rev Share</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                    <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No branches found</p>
                  </td>
                </tr>
              ) : visible.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{b.display_name}</td>
                  <td className="px-5 py-3">
                    {b.profiles ? (
                      <div>
                        <div className="font-medium text-gray-800">{b.profiles.full_name ?? '—'}</div>
                        <div className="text-xs text-gray-400">{b.profiles.email}</div>
                      </div>
                    ) : <span className="text-gray-400 italic">Unassigned</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{[b.city, b.region].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-5 py-3 text-center font-semibold text-gray-700">{b.org_count}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{Number(b.license_fee_omr).toFixed(3)}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{b.revenue_share_pct}%</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[b.status] ?? ''}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setInvite({ id: b.id, name: b.display_name })}
                        className="text-gray-400 hover:text-yellow-600 transition-colors p-1"
                        title="Generate invite code"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(b)}
                        className="text-gray-400 hover:text-yellow-600 transition-colors p-1"
                        title="Edit branch"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <BranchFormModal
          branch={editing}
          onClose={() => setModal(false)}
          onSaved={(savedId, savedName) => {
            setModal(false)
            if (!editing) {
              // New branch — open invite dialog right away
              setInvite({ id: savedId, name: savedName })
            } else {
              window.location.reload()
            }
          }}
        />
      )}

      {inviteBranch && (
        <InviteCodeDialog
          branchId={inviteBranch.id}
          branchName={inviteBranch.name}
          onClose={() => { setInvite(null); window.location.reload() }}
        />
      )}
    </div>
  )
}
