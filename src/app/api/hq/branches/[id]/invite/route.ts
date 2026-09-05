import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { issueBranchInvite } from '@/lib/hq/branchInvite'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'hq_admin') return null
  return user
}

// POST /api/hq/branches/[id]/invite — generate (or rotate) invite code for a branch.
// Manual HQ-triggered version of the same flow that fires automatically on
// agreement signature (see the agreement route). Both go through
// issueBranchInvite() so the code format/expiry/email template never drift.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: branchId } = await params
  const supabase = await createClient()
  const user = await requireHQ(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify branch exists and is active — a locked/suspended/archived branch
  // can't be invited into yet.
  const { data: branch } = await supabase
    .from('branches')
    .select('id, display_name, status')
    .eq('id', branchId)
    .single()
  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
  if (branch.status !== 'active') {
    return NextResponse.json(
      { error: `Branch is ${branch.status.replace('_', ' ')}, not active. Activate it (sign its agreement) before inviting a superadmin.` },
      { status: 409 },
    )
  }

  try {
    const result = await issueBranchInvite(supabase, {
      branchId,
      branchName: branch.display_name,
      createdBy: user.id,
      email: null, // manual dialog only shows/copies the code — it doesn't collect an email
    })
    return NextResponse.json({
      code: result.code,
      branch_name: branch.display_name,
      expires_at: result.expiresAt,
      invite_url: result.inviteUrl,
    }, { status: 201 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to generate invite' }, { status: 500 })
  }
}
