import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Bell, Clock, FileText, AlertCircle, HardHat } from 'lucide-react'
import AddNoticeForm from './AddNoticeForm'

export const metadata = { title: 'Notices' }
export const dynamic = 'force-dynamic'

const typeIcon: Record<string, React.ElementType> = {
  late_payment: AlertCircle,
  general: Bell,
}
const typeColor: Record<string, string> = {
  late_payment: 'bg-red-100 text-red-700',
  general: 'bg-blue-100 text-blue-700',
}

export default async function NoticesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found</div>

  const admin = createAdminClient()

  const [noticesRes, tenantsRes, overdueRes, techniciansRes] = await Promise.all([
    admin.from('notices')
      .select('*, tenants(full_name), technician:technician_id(full_name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    admin.from('tenants').select('id, full_name, email').eq('organization_id', orgId).order('full_name'),
    supabase.from('invoices')
      .select('id, amount, currency, due_date, tenants(id, full_name, email)')
      .eq('organization_id', orgId)
      .eq('status', 'overdue')
      .order('due_date'),
    // Technicians: profiles with role='technician' in this org
    admin.from('profiles')
      .select('id, full_name:raw_user_meta_data->full_name, organization_id')
      .eq('organization_id', orgId)
      .eq('role', 'technician'),
  ])

  const notices = noticesRes.data ?? []
  const tenants = tenantsRes.data ?? []
  const overdueInvoices = overdueRes.data ?? []

  // Build technician list from profiles + auth users
  const techProfiles = techniciansRes.data ?? []
  const technicianIds = techProfiles.map(p => p.id)

  const techEmails: { id: string; full_name: string; email: string }[] = []
  await Promise.all(technicianIds.map(async (tid) => {
    const { data: authUser } = await admin.auth.admin.getUserById(tid)
    const email = authUser?.user?.email ?? ''
    const name = (authUser?.user?.user_metadata?.full_name as string) ?? email
    techEmails.push({ id: tid, full_name: name, email })
  }))
  techEmails.sort((a, b) => a.full_name.localeCompare(b.full_name))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notices</h2>
          <p className="text-slate-500 text-sm mt-0.5">{notices.length} notices sent</p>
        </div>
        <AddNoticeForm
          orgId={orgId}
          tenants={tenants}
          technicians={techEmails}
          overdueInvoices={overdueInvoices as never}
        />
      </div>

      {/* Overdue alert banner */}
      {overdueInvoices.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-800 text-sm">
              {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''} need attention
            </div>
            <div className="text-red-700 text-xs mt-0.5">
              {(overdueInvoices as { tenants: { full_name: string } | null }[])
                .map(i => i.tenants?.full_name)
                .filter(Boolean)
                .join(', ')}
            </div>
          </div>
        </div>
      )}

      {notices.length === 0 ? (
        <div className="card p-16 text-center">
          <Bell size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">No notices yet</h3>
          <p className="text-slate-400 text-sm">Send late payment warnings or general notices to your tenants and technicians.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Type</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Subject</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Recipient</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Attachment</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notices.map(n => {
                const tenant = n.tenants as { full_name: string } | null
                const technician = (n as Record<string, unknown>).technician as { full_name: string } | null
                const isTech = n.recipient_type === 'technician'
                const Icon = typeIcon[n.type] ?? Bell
                return (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`badge flex items-center gap-1.5 w-fit ${typeColor[n.type] ?? 'bg-slate-100 text-slate-600'}`}>
                        <Icon size={11} />
                        {n.type === 'late_payment' ? 'Late Payment' : 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{n.subject}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[220px]">{n.body}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {isTech ? (
                        <span className="flex items-center gap-1.5">
                          <HardHat size={13} className="text-slate-400" />
                          {technician?.full_name ?? <span className="text-slate-400 italic text-xs">All technicians</span>}
                        </span>
                      ) : (
                        tenant?.full_name ?? <span className="text-slate-400 italic text-xs">All tenants</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {n.attachment_url ? (
                        <a href={n.attachment_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-navy-700 hover:underline">
                          <FileText size={12} /> View file
                        </a>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(n.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
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
