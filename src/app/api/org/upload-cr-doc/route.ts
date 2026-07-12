import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const formData = await req.formData()
  const userId = formData.get('userId') as string
  const file = formData.get('file') as File | null

  if (!userId || !file) {
    return NextResponse.json({ error: 'Missing userId or file' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Find the org owned by this user
  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .single()

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  // Upload to storage
  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `${org.id}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await admin.storage
    .from('cr-documents')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadErr) {
    return NextResponse.json({ error: 'Upload failed: ' + uploadErr.message }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage
    .from('cr-documents')
    .getPublicUrl(path)

  // Save URL on the organization record
  await admin
    .from('organizations')
    .update({ cr_document_url: publicUrl })
    .eq('id', org.id)

  return NextResponse.json({ ok: true, url: publicUrl })
}
