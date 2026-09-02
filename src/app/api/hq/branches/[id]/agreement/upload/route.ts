import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['hq_admin', 'hq_finance', 'hq_staff'].includes(profile.role)) return null
  return user
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const user = await requireHQ(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['pdf', 'docx', 'jpg', 'jpeg', 'png'].includes(ext ?? '')) {
    return NextResponse.json({ error: 'Invalid file type. Upload PDF, DOCX, or image.' }, { status: 400 })
  }

  // Use admin client for storage to bypass RLS
  const admin = createAdminClient()
  const bytes = await file.arrayBuffer()
  const path = `branch-agreements/${params.id}/signed_${Date.now()}.${ext}`

  const { error: uploadErr } = await admin.storage
    .from('contract-documents')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('contract-documents').getPublicUrl(path)

  const { error: dbErr } = await admin
    .from('branch_agreements')
    .upsert(
      {
        branch_id: params.id,
        signed_doc_url: publicUrl,
        signed_doc_name: file.name,
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'branch_id' }
    )

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ url: publicUrl, name: file.name })
}
