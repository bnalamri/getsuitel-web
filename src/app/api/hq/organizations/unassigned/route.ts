import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Backfill tool (rebuild step 7) — every organization created before the
// branch_id-at-signup fix (see /api/auth/signup) has branch_id = NULL. This
// route lets HQ admin find and fix those rows without a one-off SQL script.
async function requireHQAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'hq_admin') return null
  return user
}

export async function GET() {
  const supabase = await createClient()
  if (!await requireHQAdmin(supabase)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, subscription_status, subscription_plan, country, created_at')
    .is('branch_id', null)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  if (!await requireHQAdmin(supabase)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgIds, branchId } = await req.json()
  if (!Array.isArray(orgIds) || orgIds.length === 0) {
    return NextResponse.json({ error: 'Select at least one organisation' }, { status: 400 })
  }
  if (!branchId) return NextResponse.json({ error: 'Select a branch' }, { status: 400 })

  // Never silently assign into an archived branch — everything else
  // (pending_agreement, active, suspended) is a legitimate destination for
  // a data-repair operation an admin is doing deliberately.
  const { data: branch } = await supabase.from('branches').select('id, status').eq('id', branchId).single()
  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
  if (branch.status === 'archived') {
    return NextResponse.json({ error: 'Cannot assign organisations to an archived branch' }, { status: 400 })
  }

  const { error, count } = await supabase
    .from('organizations')
    .update({ branch_id: branchId })
    .in('id', orgIds)
    .is('branch_id', null) // idempotency guard — don't reassign an org someone else already fixed
    .select('id', { count: 'exact', head: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assigned: count ?? orgIds.length })
}
