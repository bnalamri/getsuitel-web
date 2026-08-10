'use client'
import { useState, useMemo } from 'react'
import { Users, Shield, ShieldOff, Search, X } from 'lucide-react'
import { RoleSelector, DisableButton } from './UserActionButtons'

const roleColor: Record<string, string> = {
  owner:            'bg-navy-100 text-navy-700',
  tenant:           'bg-emerald-100 text-emerald-700',
  technician:       'bg-orange-100 text-orange-700',
  property_manager: 'bg-teal-100 text-teal-700',
  financial_manager:'bg-purple-100 text-purple-700',
}

type Profile = {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: string
  organization_id: string | null
  created_at: string
  organizations: { name: string } | null
}

export function UsersTable({
  list,
  bannedIds,
}: {
  list: Profile[]
  bannedIds: string[]
}) {
  const banned = useMemo(() => new Set(bannedIds), [bannedIds])

  const [search, setSearch]   = useState('')
  const [filterOrg,    setFilterOrg]    = useState('')
  const [filterRole,   setFilterRole]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Build unique org name options (deduplicated by name, not by ID)
  const orgOptions = useMemo(() => {
    const seen = new Set<string>()
    list.forEach(p => { if (p.organizations?.name) seen.add(p.organizations.name) })
    const names: string[] = []
    seen.forEach(n => names.push(n))
    return names.sort((a, b) => a.localeCompare(b))
  }, [list])

  const roleOptions = useMemo(() => {
    const seen = new Set<string>()
    list.forEach(p => seen.add(p.role))
    const arr: string[] = []
    seen.forEach(r => arr.push(r))
    return arr.sort()
  }, [list])

  const filtered = useMemo(() => list.filter(p => {
    if (filterOrg && p.organizations?.name !== filterOrg) return false
    if (filterRole && p.role !== filterRole) return false
    if (filterStatus === 'disabled' && !banned.has(p.id)) return false
    if (filterStatus === 'active'   &&  banned.has(p.id)) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !p.full_name?.toLowerCase().includes(q) &&
        !p.email?.toLowerCase().includes(q) &&
        !p.organizations?.name?.toLowerCase().includes(q)
      ) return false
    }
    return true
  }), [list, filterOrg, filterRole, filterStatus, search, banned])

  const hasFilters = filterOrg || filterRole || filterStatus || search

  function clearFilters() {
    setFilterOrg(''); setFilterRole(''); setFilterStatus(''); setSearch('')
  }

  return (
    <>
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, email, org…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-navy-400"
          />
        </div>

        {/* Org dropdown */}
        <select
          value={filterOrg}
          onChange={e => setFilterOrg(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-navy-400"
        >
          <option value="">All Organizations</option>
          {orgOptions.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {/* Role dropdown */}
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-navy-400"
        >
          <option value="">All Roles</option>
          {roleOptions.map(r => (
            <option key={r} value={r}>{r.replace('_', ' ')}</option>
          ))}
        </select>

        {/* Status dropdown */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-navy-400"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 px-2 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={14} /> Clear
          </button>
        )}

        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} of {list.length} users
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">User</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Organization</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Role</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Joined</th>
              <th className="px-4 py-3 text-slate-600 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p => {
              const isDisabled = banned.has(p.id)
              return (
                <tr key={p.id} className={`hover:bg-slate-50 ${isDisabled ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 flex items-center gap-2">
                      {isDisabled && <ShieldOff size={13} className="text-red-500 flex-shrink-0"/>}
                      {p.full_name || '—'}
                    </div>
                    <div className="text-xs text-slate-400">{p.email}</div>
                    {p.phone && <div className="text-xs text-slate-400">{p.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {p.organizations?.name ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <RoleSelector userId={p.id} currentRole={p.role} />
                  </td>
                  <td className="px-4 py-3">
                    {isDisabled
                      ? <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full"><ShieldOff size={10}/> Disabled</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><Shield size={10}/> Active</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DisableButton userId={p.id} isDisabled={isDisabled} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-16 text-center">
            <Users size={36} className="mx-auto text-slate-300 mb-3"/>
            <p className="text-slate-500">{list.length === 0 ? 'No users yet' : 'No users match the filters'}</p>
          </div>
        )}
      </div>
    </>
  )
}
