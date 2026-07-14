import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Bell } from 'lucide-react'
import PlatformNoticeList from './PlatformNoticeList'

export const metadata = { title: 'Notices from GetSuitel' }
export const dynamic = 'force-dynamic'

export default async function PlatformNoticesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.organization_id
  const admin = createAdminClient()

  // Fetch broadcast + org-specific notices
  const { data: notices } = await admin
    .from('platform_notices')
    .select('*')
    .or(`target_org_id.is.null${orgId ? `,target_org_id.eq.${orgId}` : ''}`)
    .order('created_at', { ascending: false })

  // Fetch which are read
  const { data: reads } = await admin
    .from('platform_notice_reads')
    .select('notice_id')
    .eq('user_id', user.id)

  const readSet = new Set((reads ?? []).map(r => r.notice_id))

  const noticesWithRead = (notices ?? []).map(n => ({
    ...n,
    read: readSet.has(n.id),
  }))

  const unreadCount = noticesWithRead.filter(n => !n.read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">Notices from GetSuitel</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Platform updates and announcements from the GetSuitel administration team
          </p>
        </div>
        {unreadCount > 0 && (
          <span className="bg-navy-700 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Bell size={12} />
            {unreadCount} unread
          </span>
        )}
      </div>

      <PlatformNoticeList initial={noticesWithRead} />
    </div>
  )
}
