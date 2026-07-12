import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/api-auth'

// PATCH /api/admin/users — change role or ban/unban a user
export async function PATCH(req: Request) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const { userId, action, role } = await req.json()
  if (!userId || !action) return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 })

  const admin = createAdminClient()

  if (action === 'set_role') {
    if (!role) return NextResponse.json({ error: 'Missing role' }, { status: 400 })
    const { error } = await admin.from('profiles').update({ role }).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (action === 'disable') {
    // Ban the user in Supabase Auth (prevents login)
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '87600h' }) // 10 years
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Track in profiles
    await admin.from('profiles').update({ is_disabled: true }).eq('id', userId)
  }

  if (action === 'enable') {
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await admin.from('profiles').update({ is_disabled: false }).eq('id', userId)
  }

  return NextResponse.json({ ok: true })
}
