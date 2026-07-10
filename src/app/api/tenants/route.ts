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
  const { full_name, email, phone, nationality, national_id, emergency_contact, profile_id } = body

  if (!full_name || !email || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('tenants').insert({
    organization_id: profile.organization_id,
    full_name,
    email,
    phone,
    nationality: nationality ?? null,
    national_id: national_id ?? null,
    emergency_contact: emergency_contact ?? null,
    profile_id: profile_id ?? null,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
  if (!profile || !['owner', 'manager'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, full_name, email, phone, nationality, national_id, emergency_contact } = body
  if (!id) return NextResponse.json({ error: 'Missing tenant id' }, { status: 400 })
  if (!full_name || !email || !phone) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('tenants').update({
    full_name, email, phone,
    nationality: nationality || null,
    national_id: national_id || null,
    emergency_contact: emergency_contact || null,
  }).eq('id', id).eq('organization_id', profile.organization_id)

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
  if (!id) return NextResponse.json({ error: 'Missing tenant id' }, { status: 400 })

  const admin = createAdminClient()

  // Block deletion if tenant has any contracts
  const { count } = await admin.from('contracts').select('id', { count: 'exact', head: true }).eq('tenant_id', id)
  if ((count ?? 0) > 0) return NextResponse.json({ error: 'Cannot delete a tenant with existing contracts. Remove contracts first.' }, { status: 409 })

  const { error } = await admin.from('tenants').delete().eq('id', id).eq('organization_id', profile.organization_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
