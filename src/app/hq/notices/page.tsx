import { createClient } from '@/lib/supabase/server'
import NoticesClient from './NoticesClient'

export const metadata = { title: 'HQ Notices' }

export default async function HQNoticesPage() {
  const supabase = await createClient()

  const [{ data: branches }, { data: notices }] = await Promise.all([
    supabase
      .from('branches')
      .select('id, display_name')
      .in('status', ['active', 'suspended'])
      .order('display_name'),
    supabase
      .from('hq_notices')
      .select('id, title, body, priority, created_at, expires_at, target_branch_ids, profiles ( full_name )')
      .order('created_at', { ascending: false }),
  ])

  return (
    <NoticesClient
      branches={branches ?? []}
      initialNotices={(notices as Parameters<typeof NoticesClient>[0]['initialNotices']) ?? []}
    />
  )
}
