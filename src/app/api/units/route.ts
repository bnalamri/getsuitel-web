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
  const { property_id, unit_number, floor, area_sqm, bedrooms, bathrooms, rent_amount, currency, status } = body

  if (!property_id || !unit_number || !rent_amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('units').insert({
    organization_id: profile.organization_id,
    property_id,
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
