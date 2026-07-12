import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/api-auth'

export async function PATCH(req: Request) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const { orgId, name, nameAr, crNumber, authorizedRep, ownerId, nationalId } = await req.json()
  if (!orgId || !name) return NextResponse.json({ error: 'Missing orgId or name' }, { status: 400 })

  const admin = createAdminClient()

  // Update organization fields
  const orgUpdates: Record<string, string | null> = {
    name,
    name_ar:        nameAr       ?? null,
    cr_number:      crNumber     ?? null,
    authorized_rep: authorizedRep ?? null,
  }
  const { error: orgErr } = await admin.from('organizations').update(orgUpdates).eq('id', orgId)
  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 })

  // Update national_id on the owner's profile (individual orgs only)
  if (ownerId !== undefined) {
    const { error: profErr } = await admin
      .from('profiles')
      .update({ national_id: nationalId ?? null })
      .eq('id', ownerId)
    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
