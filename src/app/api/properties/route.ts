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
    return NextResponse.json({ error: 'No organization linked to this account' }, { status: 400 })
  }

  const body = await req.json()
  const { name, type, address, city, country } = body

  if (!name || !address || !city) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Enforce property limit for the org's plan
  const [{ data: org }, { count: propCount }] = await Promise.all([
    admin.from('organizations').select('max_properties').eq('id', profile.organization_id).single(),
    admin.from('properties').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id),
  ])

  const maxProperties = org?.max_properties ?? 2
  if (maxProperties !== -1 && (propCount ?? 0) >= maxProperties) {
    return NextResponse.json({
      error: `Your plan allows up to ${maxProperties} propert${maxProperties === 1 ? 'y' : 'ies'}. Upgrade your plan to add more.`,
    }, { status: 403 })
  }

  const { data, error } = await admin
    .from('properties')
    .insert({ name, type, address, city, country, organization_id: profile.organization_id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
