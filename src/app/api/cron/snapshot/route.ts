/**
 * Daily org snapshot cron — GET /api/cron/snapshot
 * Runs at 02:00 UTC. For each active org:
 *   1. Fetches all data tables
 *   2. Upserts a snapshot row (one per day, overwritten if re-run)
 *   3. Deletes snapshots older than 7 days for that org
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/api-auth'
import { logCron } from '@/lib/cron-logger'

const CRON_SECRET = process.env.CRON_SECRET
const KEEP_DAYS = 7

// Tables to snapshot — in insertion order (least dependent first)
const SNAPSHOT_TABLES = [
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

export async function GET(req: Request) {
  // Allow cron via secret OR authenticated superadmin
  const authHeader = req.headers.get('authorization')
  const isCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`
  if (!isCron) {
    const auth = await requireSuperadmin()
    if (!auth.ok) return auth.response
  }

  const _startTime = Date.now()
  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString().split('T')[0]

  // Get all orgs (exclude demo org)
  const demoEmail = process.env.DEMO_EMAIL
  const { data: orgs, error: orgsErr } = await admin
    .from('organizations')
    .select('id, name')
    .not('subscription_status', 'eq', 'canceled')

  if (orgsErr) return NextResponse.json({ error: orgsErr.message }, { status: 500 })
  if (!orgs?.length) {
    await logCron({ jobName: 'org_snapshot', status: 'success', summary: { snapshotted: 0, orgsTotal: 0, errorCount: 0 }, durationMs: Date.now() - _startTime })
    return NextResponse.json({ ok: true, snapshotted: 0 })
  }

  // Filter out demo org if needed
  let targetOrgs = orgs
  if (demoEmail) {
    const { data: demoProfile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('email', demoEmail)
      .maybeSingle()
    if (demoProfile?.organization_id) {
      targetOrgs = orgs.filter(o => o.id !== demoProfile.organization_id)
    }
  }

  let snapshotted = 0
  const errors: string[] = []

  for (const org of targetOrgs) {
    try {
      // Fetch all tables for this org
      const data: Record<string, unknown[]> = {}
      const rowCounts: Record<string, number> = {}

      for (const table of SNAPSHOT_TABLES) {
        const { data: rows } = await admin
          .from(table)
          .select('*')
          .eq('organization_id', org.id)
        data[table] = rows ?? []
        rowCounts[table] = rows?.length ?? 0
      }

      // Upsert snapshot (one per day per org)
      const { error: upsertErr } = await admin
        .from('org_snapshots')
        .upsert(
          {
            organization_id: org.id,
            snapshot_date: today,
            data,
            row_counts: rowCounts,
          },
          { onConflict: 'organization_id,snapshot_date' }
        )

      if (upsertErr) {
        errors.push(`${org.name}: ${upsertErr.message}`)
        continue
      }

      // Delete snapshots older than KEEP_DAYS
      await admin
        .from('org_snapshots')
        .delete()
        .eq('organization_id', org.id)
        .lt('snapshot_date', cutoff)

      snapshotted++
    } catch (e) {
      errors.push(`${org.name}: ${String(e)}`)
    }
  }

  await logCron({
    jobName: 'org_snapshot',
    status: errors.length > 0 ? 'partial' : 'success',
    summary: { snapshotted, orgsTotal: targetOrgs.length, errorCount: errors.length },
    errorMsg: errors.length > 0 ? errors.join(' | ') : undefined,
    durationMs: Date.now() - _startTime,
  })
  return NextResponse.json({ ok: true, snapshotted, errors, date: today })
}
