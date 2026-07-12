import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getProfileAndProperty(userId: string, propertyId: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', userId)
    .single()
  if (!profile || !['owner', 'property_manager', 'manager'].includes(profile.role)) return { error: 'Forbidden', status: 403 }

  const admin = createAdminClient()
  const { data: property } = await admin
    .from('properties')
    .select('id, organization_id')
    .eq('id', propertyId)
    .single()
  if (!property || property.organization_id !== profile.organization_id) return { error: 'Property not found', status: 404 }

  return { profile, property, admin }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await getProfileAndProperty(user.id, params.id)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  const { admin } = result

  const { name, type, address, city, country } = await req.json()
  if (!name || !address || !city) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const { error } = await admin
    .from('properties')
    .update({ name, type, address, city, country })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only owner can delete properties
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'owner') return NextResponse.json({ error: 'Only the owner can delete properties' }, { status: 403 })

  const admin = createAdminClient()

  const { data: property } = await admin
    .from('properties')
    .select('id, organization_id')
    .eq('id', params.id)
    .single()
  if (!property || property.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  // Block if property has units
  const { count } = await admin
    .from('units')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', params.id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete — this property has ${count} unit${count === 1 ? '' : 's'}. Remove all units first.` },
      { status: 409 }
    )
  }

  const { error } = await admin.from('properties').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
