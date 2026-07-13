/**
 * POST /api/admin/restore
 * Restores an org's data from a snapshot.
 * Body: { snapshotId: string }
 *
 * Process:
 *  1. Load snapshot
 *  2. Delete current org data in FK-safe order (does NOT delete org/profiles/auth)
 *  3. Re-insert all data from snapshot JSON
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/api-auth'

// Delete order: most dependent first
const DELETE_ORDER = [
  'payment_receipts',
  'cheques',
  'invoices',
  'maintenance_requests',
  'notices',
  'contracts',
  'units',
  'properties',
  'tenants',
  'team_members',
  'org_payment_settings',
  'staff_invitations',
]

// Insert order: least dependent first
const INSERT_ORDER = [
  'properties',
  'units',
  'tenants',
  'team_members',
  'org_payment_settings',
  'contracts',
  'invoices',
  'maintenance_requests',
  'notices',
  'cheques',
  'payment_receipts',
  'staff_invitations',
]

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const { snapshotId } = await request.json()
  if (!snapshotId) return NextResponse.json({ error: 'Missing snapshotId' }, { status: 400 })

  const admin = createAdminClient()

  // Load snapshot
  const { data: snapshot, error: snapErr } = await admin
    .from('org_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single()

  if (snapErr || !snapshot) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
  }

  const orgId = snapshot.organization_id
  const data = snapshot.data as Record<string, unknown[]>

  try {
    // Step 1: Delete current data in FK-safe order
    for (const table of DELETE_ORDER) {
      const { error } = await admin.from(table).delete().eq('organization_id', orgId)
      if (error) {
        console.error(`[restore] delete ${table}:`, error.message)
        // Continue — some tables may be empty
      }
    }

    // Step 2: Re-insert from snapshot
    const insertResults: Record<string, number> = {}
    for (const table of INSERT_ORDER) {
      const rows = data[table]
      if (!rows || rows.length === 0) {
        insertResults[table] = 0
        continue
      }
      const { error } = await admin.from(table).insert(rows)
      if (error) {
        console.error(`[restore] insert ${table}:`, error.message)
        // Record but continue
        insertResults[table] = -1
      } else {
        insertResults[table] = rows.length
      }
    }

    // Log the restore action
    console.log(`[restore] org ${orgId} restored from snapshot ${snapshotId} (${snapshot.snapshot_date})`)

    return NextResponse.json({
      ok: true,
      orgId,
      snapshotDate: snapshot.snapshot_date,
      insertResults,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// GET — list snapshots for an org
export async function GET(request: NextRequest) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const orgId = request.nextUrl.searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('org_snapshots')
    .select('id, snapshot_date, row_counts, created_at')
    .eq('organization_id', orgId)
    .order('snapshot_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
