import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { contractId, unitId } = await req.json()
  if (!contractId || !unitId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = createAdminClient()
  const { error: c } = await admin
    .from('contracts')
    .update({ status: 'active' })
    .eq('id', contractId)
    .eq('organization_id', profile.organization_id)

  if (c) return NextResponse.json({ error: c.message }, { status: 500 })

  await admin.from('units').update({ status: 'occupied' }).eq('id', unitId)

  return NextResponse.json({ ok: true })
}
