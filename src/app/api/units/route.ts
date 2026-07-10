import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
  if (!profile || !['owner', 'manager'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, unit_type, unit_number, floor, area_sqm, bedrooms, bathrooms, rent_amount, currency, status, occupied } = body
  if (!id) return NextResponse.json({ error: 'Missing unit id' }, { status: 400 })

  const updates: Record<string, unknown> = { unit_type: unit_type ?? 'flat', unit_number, floor, area_sqm, bedrooms, bathrooms, currency, status }
  // Only allow rent update if unit is vacant
  if (!occupied) updates.rent_amount = Number(rent_amount)

  const admin = createAdminClient()
  const { error } = await admin.from('units').update(updates).eq('id', id).eq('organization_id', profile.organization_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
  if (!profile || !['owner', 'manager'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing unit id' }, { status: 400 })

  const admin = createAdminClient()

  // Safety check — only delete if no active contract
  const { count } = await admin.from('contracts').select('*', { count: 'exact', head: true })
    .eq('unit_id', id).eq('status', 'active')
  if ((count ?? 0) > 0) return NextResponse.json({ error: 'Cannot delete an occupied unit' }, { status: 400 })

  const { error } = await admin.from('units').delete().eq('id', id).eq('organization_id', profile.organization_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

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
  const { property_id, unit_type, unit_number, floor, area_sqm, bedrooms, bathrooms, rent_amount, currency, status } = body

  if (!property_id || !unit_number || !rent_amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('units').insert({
    organization_id: profile.organization_id,
    property_id,
    unit_type: unit_type ?? 'flat',
    unit_number,
    floor: floor ?? null,
    area_sqm: area_sqm ?? null,
    bedrooms: bedrooms ?? null,
    bathrooms: bathrooms ?? null,
    rent_amount: Number(rent_amount),
    currency: currency ?? 'OMR',
    status: status ?? 'vacant',
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
