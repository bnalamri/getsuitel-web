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
  if (!profile.organization_id) {
    return NextResponse.json({ error: 'No organization linked' }, { status: 400 })
  }

  const body = await req.json()
  const { unit_id, tenant_id, start_date, end_date, rent_amount, currency, deposit_amount, payment_day, payment_method, status } = body

  if (!unit_id || !tenant_id || !start_date || !end_date || !rent_amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Block if unit already has an active contract
  const { data: existing } = await admin
    .from('contracts')
    .select('id')
    .eq('unit_id', unit_id)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'This unit already has an active contract. Terminate or edit the existing contract first.' },
      { status: 409 }
    )
  }

  const { data, error } = await admin.from('contracts').insert({
    organization_id: profile.organization_id,
    unit_id,
    tenant_id,
    start_date,
    end_date,
    rent_amount: Number(rent_amount),
    currency: currency ?? 'OMR',
    deposit_amount: Number(deposit_amount ?? 0),
    payment_day: Number(payment_day ?? 1),
    payment_method: payment_method ?? 'cash',
    status: status ?? 'draft',
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If activating immediately, mark unit as occupied
  if (status === 'active') {
    await admin.from('units').update({ status: 'occupied' }).eq('id', unit_id)
  }

  return NextResponse.json({ ok: true, id: data.id })
}
