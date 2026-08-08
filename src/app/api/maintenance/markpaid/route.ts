import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { requestId } = await req.json()
  if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })

  // Support cookie auth (web) and Bearer token auth (mobile)
  const admin = createAdminClient()
  let userId: string | null = null
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const { data: { user: mobileUser } } = await admin.auth.getUser(authHeader.slice(7))
    userId = mobileUser?.id ?? null
  } else {
    const supabase = await createClient()
    const { data: { user: webUser } } = await supabase.auth.getUser()
    userId = webUser?.id ?? null
  }
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin
    .from('profiles').select('role, organization_id').eq('id', userId).single()

  if (!profile || !['owner', 'property_manager', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await admin
    .from('maintenance_requests')
    .update({ invoice_paid: true })
    .eq('id', requestId)
    .eq('organization_id', profile.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
