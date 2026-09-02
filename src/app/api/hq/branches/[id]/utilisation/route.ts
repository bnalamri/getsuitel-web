import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['hq_admin', 'hq_finance', 'hq_staff'].includes(profile.role)) return null
  return user
}

// GET /api/hq/branches/[id]/utilisation
// Returns current counts + limits for units, staff, tenants, orgs
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const user = await requireHQ(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params

  // Fetch branch limits
  const { data: branch } = await supabase
    .from('branches')
    .select('max_units, max_staff, max_tenants, max_orgs')
    .eq('id', id)
    .single()

  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 })

  // Fetch all orgs in this branch
  const { data: orgsData } = await supabase
    .from('organizations')
    .select('id')
    .eq('branch_id', id)

  const orgIds = (orgsData ?? []).map(o => o.id)
  const orgCount = orgIds.length

  // Count units, staff, tenants across all orgs in the branch
  const [unitResult, staffResult, tenantResult] = await Promise.all([
    orgIds.length > 0
      ? supabase.from('units').select('id', { count: 'exact', head: true }).in('organization_id', orgIds)
      : Promise.resolve({ count: 0 }),
    orgIds.length > 0
      ? supabase.from('staff_invitations')
          .select('id', { count: 'exact', head: true })
          .in('organization_id', orgIds)
          .not('accepted_at', 'is', null)
      : Promise.resolve({ count: 0 }),
    orgIds.length > 0
      ? supabase.from('tenants').select('id', { count: 'exact', head: true }).in('organization_id', orgIds)
      : Promise.resolve({ count: 0 }),
  ])

  return NextResponse.json({
    orgs:    { current: orgCount,                             limit: branch.max_orgs    ?? null },
    units:   { current: (unitResult as { count: number | null }).count   ?? 0, limit: branch.max_units   ?? null },
    staff:   { current: (staffResult as { count: number | null }).count  ?? 0, limit: branch.max_staff   ?? null },
    tenants: { current: (tenantResult as { count: number | null }).count ?? 0, limit: branch.max_tenants ?? null },
  })
}
