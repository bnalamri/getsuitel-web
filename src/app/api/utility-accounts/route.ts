import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getOrgAndRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()
  if (!profile || !['owner', 'property_manager', 'manager', 'financial_manager'].includes(profile.role)) return null
  return profile as { role: string; organization_id: string }
}

// GET /api/utility-accounts?unit_id=...&utility_type=...
// GET /api/utility-accounts?property_id=...&utility_type=...&general=true
// For general scope: returns ARRAY (may have multiple accounts of same type)
// For unit scope:    returns single object or null
export async function GET(req: Request) {
  const profile = await getOrgAndRole()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const unitId      = searchParams.get('unit_id')
  const propertyId  = searchParams.get('property_id')
  const utilityType = searchParams.get('utility_type')
  const general     = searchParams.get('general') === 'true'

  const admin = createAdminClient()

  const baseSelect = 'id, label, consumer_no, meter_number, recharge_code, tariff_type, service_type, tank_number'

  if (general && propertyId) {
    // Property-level (general) — return ALL matching accounts (may be multiple)
    let q = admin
      .from('utility_accounts')
      .select(baseSelect)
      .eq('organization_id', profile.organization_id)
      .eq('property_id', propertyId)
      .is('unit_id', null)
      .order('created_at', { ascending: true })
    if (utilityType) q = q.eq('utility_type', utilityType)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])   // always returns array
  }

  if (unitId) {
    // Unit-level — still one account per (unit, type)
    let q = admin
      .from('utility_accounts')
      .select(baseSelect)
      .eq('organization_id', profile.organization_id)
      .eq('unit_id', unitId)
    if (utilityType) q = q.eq('utility_type', utilityType)
    const { data, error } = await q.maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)         // returns single object or null
  }

  return NextResponse.json(null)
}

// POST /api/utility-accounts — upsert account details
export async function POST(req: Request) {
  const profile = await getOrgAndRole()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, property_id, unit_id, utility_type, label, consumer_no, meter_number, recharge_code, tariff_type, service_type, notes, tank_number } = body

  if (!property_id || !utility_type) {
    return NextResponse.json({ error: 'property_id and utility_type are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const payload = {
    organization_id: profile.organization_id,
    property_id,
    unit_id: unit_id ?? null,
    utility_type,
    label:         label         || null,
    consumer_no:   consumer_no   || null,
    meter_number:  meter_number  || null,
    recharge_code: recharge_code || null,
    tariff_type:   tariff_type   || null,
    service_type:  service_type  || 'postpaid',
    notes:         notes         || null,
    tank_number:   tank_number   || null,
  }

  let result
  if (id) {
    const { data, error } = await admin.from('utility_accounts').update(payload).eq('id', id).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  } else {
    const { data, error } = await admin.from('utility_accounts').insert(payload).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result = data
  }

  return NextResponse.json(result)
}

// DELETE /api/utility-accounts?id=...
export async function DELETE(req: Request) {
  const profile = await getOrgAndRole()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('utility_accounts')
    .delete()
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
