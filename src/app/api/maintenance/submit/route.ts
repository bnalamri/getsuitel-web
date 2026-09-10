import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/featureFlags'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'tenant') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!profile.organization_id) {
    return NextResponse.json({ error: 'No organization linked to account' }, { status: 400 })
  }

  // Server-side enforcement of the maintenance flag — the UI hides the
  // submit button when off, but this is the actual gate (route is called
  // directly by mobile too, which has no client-side check of its own).
  if (!(await isFeatureEnabled('maintenance', profile.organization_id))) {
    return NextResponse.json({ error: 'Maintenance requests are currently unavailable for your property' }, { status: 403 })
  }

  const body = await req.json()
  const { unit_id, tenant_id, title, description, category, priority } = body

  if (!unit_id || !title || !description) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('maintenance_requests').insert({
    organization_id: profile.organization_id,
    unit_id,
    tenant_id,
    title,
    description,
    category: category ?? 'other',
    priority: priority ?? 'medium',
    status: 'open',
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
