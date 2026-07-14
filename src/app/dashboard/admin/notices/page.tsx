import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Bell, Clock, Globe, Building2 } from 'lucide-react'
import AdminNoticeForm from './AdminNoticeForm'
import ShareNoticeButton from '@/components/ShareNoticeButton'

export const metadata = { title: 'Notices — Admin' }
export const dynamic = 'force-dynamic'

export default async function AdminNoticesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'superadmin') {
    return <div className="text-red-600 p-8">Access denied.</div>
  }

  const admin = createAdminClient()

  const [noticesRes, orgsRes] = await Promise.all([
    admin
      .from('platform_notices')
      .select('*, organizations(name)')
      .order('created_at', { ascending: false }),
    admin
      .from('organizations')
      .select('id, name')
      .order('name'),
  ])

  const notices = noticesRes.data ?? []
  const orgs = orgsRes.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Owner Notices</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Send notices to all owners or a specific organisation
          </p>
        </div>
        <AdminNoticeForm orgs={orgs} />
      </div>

      {notices.length === 0 ? (
        <div className="card p-16 text-center">
          <Bell size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">No notices sent yet</h3>
          <p className="text-slate-400 text-sm">
            Use Send Notice to broadcast updates or announcements to your owners.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Title</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Recipient</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Sent</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notices.map(n => {
                const org = n.organizations as { name: string } | null
                return (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{n.title}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[300px] mt-0.5">{n.body}</div>
                    </td>
                    <td className="px-4 py-3">
                      {org ? (
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Building2 size={13} className="text-slate-400" />
                          {org.name}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                          <Globe size={13} />
                          All Owners
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(n.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ShareNoticeButton title={n.title} body={n.body} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
