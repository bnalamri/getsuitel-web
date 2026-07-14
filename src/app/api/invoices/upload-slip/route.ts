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

  if (!profile || !['owner', 'manager', 'financial_manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file      = formData.get('file') as File | null
  const invoiceId = formData.get('invoiceId') as string | null

  if (!file || !invoiceId) {
    return NextResponse.json({ error: 'Missing file or invoiceId' }, { status: 400 })
  }

  const ext    = file.name.split('.').pop() ?? 'jpg'
  const path   = `payment-slips/${profile.organization_id}/${invoiceId}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = createAdminClient()
  const { error: uploadErr } = await admin.storage
    .from('receipts')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('receipts').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
