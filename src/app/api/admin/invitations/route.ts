import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/api-auth'

// DELETE /api/admin/invitations — revoke a staff invitation
export async function DELETE(req: Request) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const { inviteId } = await req.json()
  if (!inviteId) return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('staff_invitations').delete().eq('id', inviteId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
