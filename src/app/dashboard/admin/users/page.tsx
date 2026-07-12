import { createAdminClient } from '@/lib/supabase/server'
import { Users, Shield, ShieldOff } from 'lucide-react'
import { unstable_noStore as noStore } from 'next/cache'
import { RoleSelector, DisableButton } from './UserActionButtons'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'User Management' }

const roleColor: Record<string, string> = {
  owner:            'bg-navy-100 text-navy-700',
  tenant:           'bg-emerald-100 text-emerald-700',
  technician:       'bg-orange-100 text-orange-700',
  property_manager: 'bg-teal-100 text-teal-700',
  financial_manager:'bg-purple-100 text-purple-700',
  superadmin:       'bg-slate-200 text-slate-700',
}

export default async function UsersPage() {
  noStore()
  const admin = createAdminClient()

  // Fetch all profiles with org name
  const { data: profiles } = await admin
    .from('profiles')
    .select('*, organizations(name)')
    .neq('role', 'superadmin')
    .order('created_at', { ascending: false })

  // Fetch banned users from auth
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const bannedIds = new Set(
    authUsers
      .filter(u => u.banned_until && new Date(u.banned_until) > new Date())
      .map(u => u.id)
  )

  const list = profiles ?? []

  const byRole = list.reduce((acc: Record<string, number>, p) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1; return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
        <p className="text-slate-500 text-sm mt-0.5">{list.length} users across all organizations</p>
      </div>

      {/* Role summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(byRole).map(([role, count]) => (
          <span key={role} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${roleColor[role] ?? 'bg-slate-100 text-slate-600'}`}>
            {role.replace('_', ' ')} <span className="font-black">{count}</span>
          </span>
        ))}
        {bannedIds.size > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <ShieldOff size={11}/> disabled <span className="font-black">{bannedIds.size}</span>
          </span>
        )}
      </div>

      {/* User table */}
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
            {list.map(p => {
              const org        = p.organizations as { name: string } | null
              const isDisabled = bannedIds.has(p.id)
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
                    {org?.name ?? <span className="text-slate-300">—</span>}
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
        {list.length === 0 && (
          <div className="p-16 text-center">
            <Users size={36} className="mx-auto text-slate-300 mb-3"/>
            <p className="text-slate-500">No users yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
