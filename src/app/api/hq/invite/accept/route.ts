import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { token, name, password } = await req.json()
  if (!token || !name?.trim() || !password || password.length < 8) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Validate token
  const { data: invitation } = await admin
    .from('hq_invitations')
    .select('id, email, expires_at, accepted_at')
    .eq('token', token)
    .single()

  if (!invitation) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
  if (invitation.accepted_at) return NextResponse.json({ error: 'Invitation already used' }, { status: 410 })
  if (new Date(invitation.expires_at) < new Date()) return NextResponse.json({ error: 'Invitation expired' }, { status: 410 })

  // Check not already registered
  const { data: existing } = await admin.auth.admin.listUsers()
  const alreadyExists = existing?.users?.some(u => u.email === invitation.email)
  if (alreadyExists) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name.trim() },
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 500 })
  }

  // Upsert profile with hq_staff role
  const { error: profileError } = await admin.from('profiles').upsert({
    id: authData.user.id,
    email: invitation.email,
    full_name: name.trim(),
    role: 'hq_staff',
  })

  if (profileError) {
    // Rollback auth user
    await admin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }

  // Mark invitation as accepted
  await admin.from('hq_invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invitation.id)

  return NextResponse.json({ ok: true })
}
