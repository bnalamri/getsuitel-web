import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/api-auth'

export async function PATCH(req: Request) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const { orgId, maxProperties, maxUnits, maxTenants } = await req.json()
  if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })

  const updates: Record<string, number> = {}
  if (maxProperties !== '' && maxProperties != null) updates.max_properties = Number(maxProperties)
  if (maxUnits !== '' && maxUnits != null) updates.max_units = Number(maxUnits)
  if (maxTenants !== '' && maxTenants != null) updates.max_tenants = Number(maxTenants)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No values provided' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('organizations').update(updates).eq('id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
