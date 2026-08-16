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

  const formData  = await req.formData()
  const expenseId = formData.get('expenseId') as string | null
  const file      = formData.get('file')      as File   | null

  if (!expenseId || !file) {
    return NextResponse.json({ error: 'Missing expenseId or file' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: expense } = await admin
    .from('expenses')
    .select('id, organization_id')
    .eq('id', expenseId)
    .single()

  if (!expense || expense.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  const ext  = file.name.split('.').pop() ?? 'pdf'
  const path = `${profile.organization_id}/${expenseId}/attachment.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('expenses')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('expenses').getPublicUrl(path)

  const { error: updateErr } = await admin
    .from('expenses')
    .update({ attachment_url: publicUrl })
    .eq('id', expenseId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, url: publicUrl })
}
