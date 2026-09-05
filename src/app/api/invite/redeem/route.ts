import { NextRequest, NextResponse } from 'next/server'

// POST /api/invite/redeem
// Body: { code: string }
// Caller must be authenticated (just registered). Marks code used and sets profile.role + branch.superadmin_id
export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 })

  // Use service role to read + update (user's role not yet set, RLS would block)
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Get caller's user ID from their session cookie (passed by browser)
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Fetch and validate the code
  const { data: invite } = await service
    .from('invite_codes')
    .select('id, branch_id, used_by, expires_at, branches(status)')
    .eq('code', code.trim().toUpperCase())
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  if (invite.used_by) return NextResponse.json({ error: 'Invite code already used' }, { status: 410 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Invite code expired' }, { status: 410 })

  // Same activation gate as /api/invite/register — a locked, suspended, or
  // archived branch's code should not silently keep working.
  const branchRow = Array.isArray(invite.branches) ? invite.branches[0] : invite.branches
  if (branchRow?.status !== 'active') {
    return NextResponse.json(
      { error: `This branch is not active yet (status: ${branchRow?.status ?? 'unknown'}).` },
      { status: 403 },
    )
  }

  // Mark code as used
  const { error: useErr } = await service
    .from('invite_codes')
    .update({ used_by: user.id, used_at: new Date().toISOString() })
    .eq('id', invite.id)
  if (useErr) return NextResponse.json({ error: useErr.message }, { status: 500 })

  // Set profile role to superadmin
  const { error: profileErr } = await service
    .from('profiles')
    .update({ role: 'superadmin' })
    .eq('id', user.id)
  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

  // Assign as branch superadmin
  const { error: branchErr } = await service
    .from('branches')
    .update({ superadmin_id: user.id })
    .eq('id', invite.branch_id)
  if (branchErr) return NextResponse.json({ error: branchErr.message }, { status: 500 })

  return NextResponse.json({ success: true, branch_id: invite.branch_id })
}
