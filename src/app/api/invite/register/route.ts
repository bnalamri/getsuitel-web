import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// POST /api/invite/register
// Body: { code, name, email, password }
// Creates the Supabase auth user + redeems the invite — all via service role.
// Skips email-confirmation requirement so the user can log in immediately.
export async function POST(req: NextRequest) {
  const { code, name, email, password } = await req.json()

  if (!code || !name || !email || !password)
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  if (password.length < 8)
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 1. Validate invite code
  const { data: invite } = await service
    .from('invite_codes')
    .select('id, branch_id, used_by, expires_at')
    .eq('code', code.trim().toUpperCase())
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  if (invite.used_by) return NextResponse.json({ error: 'Invite code already used' }, { status: 410 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Invite code expired' }, { status: 410 })

  // 2. Create Supabase auth user (email_confirm bypassed via admin API)
  const { data: authData, error: authErr } = await service.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,             // mark confirmed so they can log in immediately
    user_metadata: { full_name: name.trim() },
  })

  if (authErr) {
    // Handle duplicate email gracefully
    const msg = authErr.message.toLowerCase().includes('already') || authErr.message.toLowerCase().includes('duplicate')
      ? 'An account with this email already exists'
      : authErr.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const userId = authData.user?.id
  if (!userId) return NextResponse.json({ error: 'Account creation failed' }, { status: 500 })

  // 3. Mark invite code as used
  await service
    .from('invite_codes')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('id', invite.id)

  // 4. Set profile role to superadmin (profile is created by handle_new_user trigger)
  // Wait a moment for the trigger to run
  await new Promise(r => setTimeout(r, 500))
  await service
    .from('profiles')
    .update({ role: 'superadmin', full_name: name.trim() })
    .eq('id', userId)

  // 5. Assign as branch superadmin
  await service
    .from('branches')
    .update({ superadmin_id: userId })
    .eq('id', invite.branch_id)

  return NextResponse.json({ success: true })
}
