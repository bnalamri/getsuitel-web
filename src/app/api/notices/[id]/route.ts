import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const ownerRoles = ['owner', 'manager', 'property_manager', 'financial_manager']

  if (ownerRoles.includes(profile.role)) {
    // Owner-side: must belong to their org
    const { error } = await admin
      .from('notices')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  } else if (profile.role === 'tenant') {
    // Tenant: can only delete notices addressed to them
    const { data: tenant } = await admin.from('tenants').select('id').eq('profile_id', user.id).single()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    const { error } = await admin
      .from('notices')
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', tenant.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  } else if (profile.role === 'technician') {
    // Technician: can only delete notices addressed to them
    const { error } = await admin
      .from('notices')
      .delete()
      .eq('id', params.id)
      .eq('technician_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
}
