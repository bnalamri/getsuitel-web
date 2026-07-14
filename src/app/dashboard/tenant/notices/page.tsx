import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Bell, AlertCircle, FileText, Clock } from 'lucide-react'
import DeleteNoticeButton from '@/components/DeleteNoticeButton'

export const metadata = { title: 'Notices' }

export default async function TenantNoticesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tenant } = await supabase.from('tenants').select('id').eq('profile_id', user.id).single()
  if (!tenant) return <div className="text-slate-400 text-center py-20">No tenant profile found.</div>

  const { data: notices } = await supabase
    .from('notices')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  const list = notices ?? []

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-slate-900">Notices</h2>

      {list.length === 0 ? (
        <div className="card p-16 text-center">
          <Bell size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">No notices</h3>
          <p className="text-slate-400 text-sm mt-1">Notices from your landlord will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(n => {
            const isLate = n.type === 'late_payment'
            return (
              <div key={n.id} className={`card p-5 border-l-4 ${isLate ? 'border-l-red-500' : 'border-l-blue-500'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isLate ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {isLate ? <AlertCircle size={17} /> : <Bell size={17} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">{n.subject}</span>
                        <span className={`badge text-xs ${isLate ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isLate ? 'Late Payment' : 'General'}
                        </span>
                      </div>
                      <DeleteNoticeButton noticeId={n.id} apiPath="/api/notices" />
                    </div>
                    <div className="text-sm text-slate-600 mt-2 whitespace-pre-line leading-relaxed">{n.body}</div>
                    {n.attachment_url && (
                      <a href={n.attachment_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-xs text-navy-700 hover:underline font-medium">
                        <FileText size={12} /> View Attachment
                      </a>
                    )}
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-3">
                      <Clock size={11} />
                      {new Date(n.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
