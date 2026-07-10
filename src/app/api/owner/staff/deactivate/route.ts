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

  // Delete the auth user entirely — cascades to profile, frees the email for re-registration
  const { error: deleteError } = await admin.auth.admin.deleteUser(staffId)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
