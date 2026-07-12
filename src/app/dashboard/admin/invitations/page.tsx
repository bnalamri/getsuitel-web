import { createAdminClient } from '@/lib/supabase/server'
import { Mail, Clock, CheckCircle } from 'lucide-react'
import { unstable_noStore as noStore } from 'next/cache'
import RevokeButton from './RevokeButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Staff Invitations' }

const roleColor: Record<string, string> = {
  technician:       'bg-orange-100 text-orange-700',
  property_manager: 'bg-teal-100 text-teal-700',
  financial_manager:'bg-purple-100 text-purple-700',
}

export default async function InvitationsPage() {
  noStore()
  const admin = createAdminClient()

  const { data: invites } = await admin
    .from('staff_invitations')
    .select('*, organizations(name)')
    .order('created_at', { ascending: false })

  const list    = invites ?? []
  const pending = list.filter(i => i.status === 'pending' && new Date(i.expires_at) > new Date())
  const expired = list.filter(i => i.status === 'pending' && new Date(i.expires_at) <= new Date())
  const used    = list.filter(i => i.status === 'used')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Staff Invitations</h2>
        <p className="text-slate-500 text-sm mt-0.5">{list.length} total · {pending.length} pending</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending',  count: pending.length, color: 'text-yellow-700 bg-yellow-50' },
          { label: 'Expired',  count: expired.length, color: 'text-slate-500 bg-slate-50' },
          { label: 'Accepted', count: used.length,    color: 'text-emerald-700 bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className={`card p-4 ${s.color}`}>
            <div className="text-3xl font-black">{s.count}</div>
            <div className="text-sm font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Invited Email</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Organization</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Role</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Expires</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map(inv => {
              const org     = inv.organizations as { name: string } | null
              const isExp   = new Date(inv.expires_at) <= new Date()
              const isUsed  = inv.status === 'used'
              const isPend  = inv.status === 'pending' && !isExp
              return (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400"/>
                      {inv.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{org?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge capitalize ${roleColor[inv.role] ?? 'bg-slate-100 text-slate-600'}`}>
                      {inv.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isUsed
                      ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle size={10}/> Accepted</span>
                      : isExp
                        ? <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full"><Clock size={10}/> Expired</span>
                        : <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full"><Clock size={10}/> Pending</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(inv.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isPend && <RevokeButton inviteId={inv.id} />}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {list.length === 0 && (
          <div className="p-16 text-center">
            <Mail size={36} className="mx-auto text-slate-300 mb-3"/>
            <p className="text-slate-500">No invitations yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
