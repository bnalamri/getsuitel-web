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

  if (!profile || !['owner', 'property_manager', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const contractId = formData.get('contractId') as string | null
  const file       = formData.get('file')       as File   | null
  const rawType    = (formData.get('type') as string | null) ?? 'municipality_agreement'

  const validTypes = ['municipality_agreement', 'national_id_copy'] as const
  type DocType = typeof validTypes[number]
  if (!validTypes.includes(rawType as DocType)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  const docType = rawType as DocType
  const columnName = docType === 'municipality_agreement'
    ? 'municipality_agreement_url'
    : 'national_id_copy_url'

  if (!contractId || !file) {
    return NextResponse.json({ error: 'Missing contractId or file' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify contract belongs to this org
  const { data: contract } = await admin
    .from('contracts')
    .select('id, organization_id')
    .eq('id', contractId)
    .single()

  if (!contract || contract.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  const ext = file.name.split('.').pop() ?? 'pdf'
  const path = `${profile.organization_id}/${contractId}/${docType}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from('contract-documents')
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage
    .from('contract-documents')
    .getPublicUrl(path)

  const { error: updateError } = await admin
    .from('contracts')
    .update({ [columnName]: publicUrl })
    .eq('id', contractId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, url: publicUrl })
}
