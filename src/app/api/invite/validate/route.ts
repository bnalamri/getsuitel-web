import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/invite/validate?code=XXXX-XXXX
// Returns branch info for a valid unused unexpired code.
// No auth required — this is called before the superadmin has an account.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 })

  // Use service-role to bypass RLS (user has no session yet)
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: invite } = await service
    .from('invite_codes')
    .select('id, code, branch_id, expires_at, used_by, branches(display_name, city, region, status)')
    .eq('code', code)
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  if (invite.used_by) return NextResponse.json({ error: 'This invite code has already been used' }, { status: 410 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'This invite code has expired' }, { status: 410 })

  const branch = invite.branches as { display_name: string; city: string | null; region: string | null; status: string } | null

  if (branch?.status !== 'active') {
    return NextResponse.json(
      { error: `This branch is not active yet (status: ${branch?.status ?? 'unknown'}). Its invite link will work once HQ activates the branch.` },
      { status: 403 },
    )
  }

  return NextResponse.json({
    valid: true,
    code: invite.code,
    branch_id: invite.branch_id,
    branch_name: branch?.display_name ?? 'Unknown Branch',
    branch_location: [branch?.city, branch?.region].filter(Boolean).join(', ') || null,
    expires_at: invite.expires_at,
  })
}
