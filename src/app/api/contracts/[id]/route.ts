import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

  const {
    tenant_id, unit_id, start_date, end_date,
    rent_amount, currency, deposit_amount, payment_day, payment_method, status,
    prev_unit_id, prev_status,
  } = await req.json()

  const admin = createAdminClient()

  // Verify contract belongs to this org
  const { data: existing } = await admin
    .from('contracts')
    .select('id, unit_id, status, organization_id')
    .eq('id', params.id)
    .single()

  if (!existing || existing.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  // If activating, check no OTHER active contract exists for this unit
  if (status === 'active' && prev_status !== 'active') {
    const { data: conflict } = await admin
      .from('contracts')
      .select('id')
      .eq('unit_id', unit_id)
      .eq('status', 'active')
      .neq('id', params.id)
      .maybeSingle()

    if (conflict) {
      return NextResponse.json(
        { error: 'This unit already has an active contract. Terminate it first.' },
        { status: 409 }
      )
    }
  }

  const { error } = await admin.from('contracts').update({
    tenant_id,
    unit_id,
    start_date,
    end_date,
    rent_amount: Number(rent_amount),
    currency: currency ?? 'OMR',
    deposit_amount: Number(deposit_amount ?? 0),
    payment_day: Number(payment_day ?? 1),
    payment_method: payment_method ?? 'cash',
    status,
  }).eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync unit occupancy status
  const wasActive = prev_status === 'active'
  const isNowActive = status === 'active'
  const unitChanged = prev_unit_id !== unit_id

  if (unitChanged) {
    // Free the old unit if contract was active
    if (wasActive) {
      await admin.from('units').update({ status: 'vacant' }).eq('id', prev_unit_id)
    }
    // Occupy the new unit if now active
    if (isNowActive) {
      await admin.from('units').update({ status: 'occupied' }).eq('id', unit_id)
    }
  } else {
    // Same unit — sync status
    if (!wasActive && isNowActive) {
      await admin.from('units').update({ status: 'occupied' }).eq('id', unit_id)
    } else if (wasActive && !isNowActive) {
      await admin.from('units').update({ status: 'vacant' }).eq('id', unit_id)
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
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

  const admin = createAdminClient()

  // Fetch contract to check ownership and get unit_id + status
  const { data: contract } = await admin
    .from('contracts')
    .select('id, unit_id, status, organization_id')
    .eq('id', params.id)
    .single()

  if (!contract || contract.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  // Delete contract (invoices/cheques cascade via FK if set, otherwise delete manually)
  const { error } = await admin.from('contracts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Free the unit if contract was active
  if (contract.status === 'active') {
    await admin.from('units').update({ status: 'vacant' }).eq('id', contract.unit_id)
  }

  return NextResponse.json({ ok: true })
}
