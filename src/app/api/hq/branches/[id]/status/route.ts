import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { notifyBranchStatusChange } from '@/lib/hq/branchStatusEmail'

// Supports both cookie auth (web) and Bearer token auth (mobile) — mobile's
// Actions tab used to write branches.status directly via the Supabase
// client, which meant a phone-triggered suspend/reactivate never went
// through this route at all (no audit-log consistency, and now, no email).
// Routing mobile through this same endpoint keeps status changes,
// audit logging, and notification on one shared path regardless of which
// client made the change (see hq_branch_detail.dart _ActionsTab).
async function resolveHQAdmin(req: NextRequest, admin: ReturnType<typeof createAdminClient>) {
  const authHeader = req.headers.get('authorization')
  let userId: string | null = null

  // Wrapped in try/catch: a malformed/expired Bearer token (mobile) can make
  // admin.auth.getUser() throw rather than just returning a null user, and an
  // uncaught throw here used to crash the whole route handler into a bare,
  // bodyless 500 — which the mobile client couldn't even jsonDecode to show
  // an error. Treat any failure to resolve a user as "unauthenticated" so the
  // caller always gets a real 401 JSON response instead of a silent crash.
  try {
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user } } = await admin.auth.getUser(authHeader.slice(7))
      userId = user?.id ?? null
    } else {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    }
  } catch {
    return null
  }
  if (!userId) return null

  const { data: profile } = await admin.from('profiles').select('role, full_name').eq('id', userId).single()
  if (profile?.role !== 'hq_admin') return null
  return { id: userId, fullName: profile.full_name as string | null }
}

// PATCH /api/hq/branches/[id]/status
// body: { status: 'active' | 'suspended' | 'archived' }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Whole handler wrapped in try/catch: any unhandled throw in an App
  // Router Route Handler otherwise becomes a bare, bodyless 500 in
  // production — which a client that tries to jsonDecode the response
  // can't even show a message for (see resolveHQAdmin's comment). Every
  // exit path below now guarantees a JSON body.
  try {
    const admin = createAdminClient()
    const actor = await resolveHQAdmin(req, admin)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = params
    const body = await req.json()
    const { status } = body as { status: string }

    if (!['active', 'suspended', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    // Archive safety check: block if branch still has active orgs
    if (status === 'archived') {
      const { count } = await admin
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', id)

      if ((count ?? 0) > 0) {
        return NextResponse.json(
          { error: `Cannot archive: branch still has ${count} organisation(s). Reassign or remove them first.` },
          { status: 409 }
        )
      }
    }

    // Fetch current status for audit diff
    const { data: current } = await admin
      .from('branches')
      .select('status')
      .eq('id', id)
      .single()

    const { data, error } = await admin
      .from('branches')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, display_name, status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log
    await admin.from('hq_audit_logs').insert({
      branch_id: id,
      actor_id:  actor.id,
      action:    'status_change',
      details:   { from: current?.status ?? null, to: status },
    }).throwOnError().catch(() => {}) // non-fatal if table not yet created

    // Notify the branch superadmin + HQ admin/finance team on suspend/
    // reactivate (not archive — see notifyBranchStatusChange). Awaited so it
    // completes before this serverless function returns, but failures never
    // block the status change itself.
    if (status === 'suspended' || status === 'active') {
      try {
        await notifyBranchStatusChange(admin, {
          branchId: id,
          branchName: data.display_name ?? data.name,
          status,
          actorName: actor.fullName,
        })
      } catch { /* email failure is non-fatal */ }
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error' },
      { status: 500 }
    )
  }
}
