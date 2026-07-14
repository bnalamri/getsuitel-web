import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET — fetch platform notices for the logged-in owner (or their org's staff)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  const allowedRoles = ['owner', 'property_manager', 'financial_manager', 'manager']
  if (!profile || !allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = profile.organization_id
  const admin = createAdminClient()

  // Fetch notices: broadcast (target_org_id IS NULL) or targeted to this org
  const { data: notices, error } = await admin
    .from('platform_notices')
    .select('*')
    .or(`target_org_id.is.null,target_org_id.eq.${orgId}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch which ones this user has already read
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

  return NextResponse.json({ notices: noticesWithRead, unreadCount })
}

// POST — mark a platform notice as read
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { noticeId } = await req.json() as { noticeId: string }
  if (!noticeId) return NextResponse.json({ error: 'noticeId required' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('platform_notice_reads').upsert(
    { notice_id: noticeId, user_id: user.id },
    { onConflict: 'notice_id,user_id' }
  )

  return NextResponse.json({ ok: true })
}
