import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/api-auth'

export async function PATCH(req: Request) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const { orgId, name, nameAr } = await req.json()
  if (!orgId || !name) return NextResponse.json({ error: 'Missing orgId or name' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('organizations')
    .update({ name, name_ar: nameAr ?? null })
    .eq('id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
