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

  if (!profile || !['owner', 'property_manager', 'manager', 'financial_manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const billId = formData.get('billId') as string | null  // optional — omit for pre-upload
  const file   = formData.get('file')   as File   | null

  if (!file) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }

  const admin = createAdminClient()
  const ext   = file.name.split('.').pop() ?? 'pdf'

  if (billId) {
    // Post-creation upload — verify bill belongs to this org, then update it
    const { data: bill } = await admin
      .from('utility_bills')
      .select('id, organization_id')
      .eq('id', billId)
      .single()

    if (!bill || bill.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    const path = `${profile.organization_id}/${billId}/attachment.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadErr } = await admin.storage
      .from('utility-bills')
      .upload(path, arrayBuffer, { contentType: file.type, upsert: true })
    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const { data: { publicUrl } } = admin.storage.from('utility-bills').getPublicUrl(path)
    await admin.from('utility_bills').update({ attachment_url: publicUrl }).eq('id', billId)
    return NextResponse.json({ ok: true, url: publicUrl })
  }

  // Pre-upload (no bill ID yet) — upload to a temp path and return the URL.
  // The caller passes this URL in the bill creation POST body so the email includes it.
  const tempId  = crypto.randomUUID()
  const path    = `${profile.organization_id}/pre-${tempId}/attachment.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('utility-bills')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('utility-bills').getPublicUrl(path)
  return NextResponse.json({ ok: true, url: publicUrl })
}
