import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const BUCKET = 'floor-plans'

// POST — upload floor plan image for a unit
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
  if (!profile || !['owner', 'property_manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const unitId = formData.get('unitId') as string
  const file   = formData.get('file') as File | null

  if (!unitId || !file) return NextResponse.json({ error: 'Missing unitId or file' }, { status: 400 })

  const admin = createAdminClient()

  // Verify unit belongs to this org
  const { data: unit } = await admin.from('units').select('id, floor_plan_url').eq('id', unitId).eq('organization_id', profile.organization_id).single()
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

  // Remove old file if exists
  if (unit.floor_plan_url) {
    const oldPath = unit.floor_plan_url.split(`/${BUCKET}/`)[1]
    if (oldPath) await admin.storage.from(BUCKET).remove([oldPath])
  }

  // Upload new file
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${profile.organization_id}/${unitId}/floor_plan.${ext}`
  const buf  = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type,
    upsert: true,
  })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

  const { error: dbError } = await admin.from('units').update({ floor_plan_url: publicUrl }).eq('id', unitId)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ ok: true, url: publicUrl })
}

// DELETE — remove floor plan for a unit
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single()
  if (!profile || !['owner', 'property_manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { unitId } = await req.json()
  if (!unitId) return NextResponse.json({ error: 'Missing unitId' }, { status: 400 })

  const admin = createAdminClient()

  const { data: unit } = await admin.from('units').select('floor_plan_url').eq('id', unitId).eq('organization_id', profile.organization_id).single()
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

  if (unit.floor_plan_url) {
    const oldPath = unit.floor_plan_url.split(`/${BUCKET}/`)[1]
    if (oldPath) await admin.storage.from(BUCKET).remove([oldPath])
  }

  await admin.from('units').update({ floor_plan_url: null }).eq('id', unitId)
  return NextResponse.json({ ok: true })
}
