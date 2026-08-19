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

// GET /api/utility-accounts/list?property_id=...&utility_type=...
export async function GET(req: Request) {
  const profile = await getOrgAndRole()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const propertyId  = searchParams.get('property_id')
  const utilityType = searchParams.get('utility_type')

  const admin = createAdminClient()
  let q = admin
    .from('utility_accounts')
    .select(`
      id, utility_type, consumer_no, meter_number, recharge_code,
      tariff_type, service_type, notes, unit_id, property_id,
      units(unit_number),
      properties(name)
    `)
    .eq('organization_id', profile.organization_id)
    .order('property_id')
    .order('unit_id', { nullsFirst: true })
    .order('utility_type')

  if (propertyId)  q = q.eq('property_id', propertyId)
  if (utilityType) q = q.eq('utility_type', utilityType)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
