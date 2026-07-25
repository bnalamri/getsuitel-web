import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
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

  const admin = createAdminClient()

  // Verify contract belongs to this org
  const { data: contract } = await admin
    .from('contracts')
    .select('id, organization_id')
    .eq('id', params.id)
    .single()

  if (!contract || contract.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  // Support ?type=national_id_copy to remove that column instead
  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? 'municipality_agreement'
  const columnName = type === 'national_id_copy' ? 'national_id_copy_url' : 'municipality_agreement_url'

  const { error } = await admin
    .from('contracts')
    .update({ [columnName]: null })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
