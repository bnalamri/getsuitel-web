import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['hq_admin', 'hq_finance'].includes(profile.role)) return null
  return user
}

// PATCH /api/hq/branches/[id]/limits
// body: { max_units?: number, max_staff?: number, max_tenants?: number }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const user = await requireHQ(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  const body = await req.json()

  const update: Record<string, number | null> = {}
  for (const key of ['max_units', 'max_staff', 'max_tenants', 'max_orgs'] as const) {
    if (key in body) {
      const v = body[key]
      if (v !== null && (typeof v !== 'number' || v < 0 || !Number.isInteger(v))) {
        return NextResponse.json({ error: `${key} must be a non-negative integer` }, { status: 400 })
      }
      update[key] = v
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  // Fetch current limits for audit diff
  const { data: current } = await supabase
    .from('branches')
    .select('max_units, max_staff, max_tenants, max_orgs')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('branches')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log — `.throwOnError()` doesn't return something with a `.catch`
  // method on this supabase-js version, so `.throwOnError().catch(() => {})`
  // threw a raw TypeError instead of being swallowed (same bug found in the
  // branch status route) — wrap in a real try/catch instead.
  try {
    await supabase.from('hq_audit_logs').insert({
      branch_id: id,
      actor_id:  user.id,
      action:    'limits_update',
      details:   { before: current ?? {}, after: update },
    })
  } catch {
    // non-fatal if table not yet created
  }

  return NextResponse.json({ ok: true })
}
