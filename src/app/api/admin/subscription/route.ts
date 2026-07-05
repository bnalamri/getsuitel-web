import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { orgId, plan, status, maxUnits, maxTenants } = await req.json()
  if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })

  const updates: Record<string, unknown> = {
    subscription_plan: plan,
    subscription_status: status,
  }
  if (maxUnits) updates.max_units = Number(maxUnits)
  if (maxTenants) updates.max_tenants = Number(maxTenants)
  if (status === 'active') updates.subscription_ends_at = new Date(Date.now() + 365 * 86400000).toISOString()

  const admin = createAdminClient()
  const { error } = await admin.from('organizations').update(updates).eq('id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
