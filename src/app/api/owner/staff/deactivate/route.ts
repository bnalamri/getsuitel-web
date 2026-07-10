import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, organization_id').eq('id', user.id).single()

  if (!profile || profile.role !== 'owner' || !profile.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { staffId } = await req.json()
  if (!staffId) return NextResponse.json({ error: 'Missing staffId' }, { status: 400 })

  const admin = createAdminClient()

  // Verify the staff member belongs to this org
  const { data: staffProfile } = await admin
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', staffId)
    .single()

  if (!staffProfile || staffProfile.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Staff member not found in your organization' }, { status: 404 })
  }

  if (!['property_manager', 'financial_manager'].includes(staffProfile.role)) {
    return NextResponse.json({ error: 'Cannot deactivate this account type' }, { status: 400 })
  }

  // 1. Strip org link and role from profile
  const { error: profileError } = await admin
    .from('profiles')
    .update({ organization_id: null, role: 'tenant' })
    .eq('id', staffId)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  // 2. Ban the auth user — invalidates all active sessions immediately
  //    and blocks any future login attempts
  const { error: banError } = await admin.auth.admin.updateUserById(staffId, {
    ban_duration: '87600h', // 10 years = effectively permanent
  })

  if (banError) return NextResponse.json({ error: banError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
