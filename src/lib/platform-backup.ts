/**
 * Full-platform logical backup — the free-tier stand-in for Supabase's
 * "Daily backups" feature (Pro plan only). Dumps every core table to a
 * single JSON file in the private `platform-backups` storage bucket,
 * records a row in `platform_backups`, and prunes old backups.
 *
 * Used by:
 *  - /api/cron/platform-backup (daily, scheduled in vercel.json)
 *  - /api/hq/backups (POST — manual "Run Backup Now" from the HQ dashboard)
 */
import { createAdminClient } from '@/lib/supabase/server'

const BUCKET = 'platform-backups'
const RETENTION_DAYS = 14
const PAGE_SIZE = 1000 // Supabase's per-request row cap

// Every core table captured in the backup file. Order doesn't matter for
// the JSON dump itself (each table is just a flat array), but does matter
// for RESTORE_TABLES below.
export const BACKUP_TABLES = [
  'branches',
  'branch_billing',
  'branch_feature_flags',
  'platform_config',
  'subscription_plans',
  'organizations',
  'profiles', // captured for visibility/manual recovery — see restore() note
  'org_feature_flags',
  'properties',
  'units',
  'tenants',
  'contracts',
  'invoices',
  'maintenance_requests',
  'notices',
  'cheques',
  'payment_receipts',
  'staff_invitations',
  'subscription_payment_proofs',
  'tenancy_agreement_templates',
  'utility_accounts',
  'utility_bills',
  'platform_notices',
  'platform_notice_reads',
  'hq_invitations',
  'invite_codes',
  'documents',
  'notifications',
  'deleted_accounts',
] as const

// Subset that the "Restore" action will touch. `profiles` is deliberately
// excluded: profiles.id must always match a live auth.users row. Restoring
// stale profile rows from a backup could orphan anyone who signed up after
// the backup was taken (their profile would vanish with nothing to put back)
// — a risk to login/access, not just data. `profiles` is still captured in
// every backup file so it's available to restore by hand if ever needed.
//
// Order matters here: parents before children, so a row that needs
// reinserting (e.g. one that was hard-deleted after the backup) finds its
// foreign keys already in place.
export const RESTORE_TABLES = BACKUP_TABLES.filter(t => t !== 'profiles')

export type BackupResult = {
  status: 'success' | 'partial' | 'error'
  storagePath?: string
  sizeBytes?: number
  rowCounts: Record<string, number>
  errors: string[]
}

export async function runPlatformBackup(): Promise<BackupResult> {
  const admin = createAdminClient()
  const rowCounts: Record<string, number> = {}
  const errors: string[] = []
  const dump: Record<string, unknown[]> = {}

  for (const table of BACKUP_TABLES) {
    try {
      const rows: unknown[] = []
      let from = 0
      for (;;) {
        const { data, error } = await admin
          .from(table)
          .select('*')
          .range(from, from + PAGE_SIZE - 1)
        if (error) throw error
        rows.push(...(data ?? []))
        if (!data || data.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }
      dump[table] = rows
      rowCounts[table] = rows.length
    } catch (e) {
      const msg = e instanceof Error
        ? e.message
        : (typeof e === 'object' && e !== null && 'message' in e)
          ? String((e as { message: unknown }).message)
          : JSON.stringify(e)
      errors.push(`${table}: ${msg}`)
      dump[table] = []
      rowCounts[table] = 0
    }
  }

  const payload = JSON.stringify({ generated_at: new Date().toISOString(), tables: dump })
  const buffer = Buffer.from(payload, 'utf-8')
  const now = new Date()
  const path = `full/${now.toISOString().split('T')[0]}_${now.getTime()}.json`

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: 'application/json', upsert: false })

  if (uploadErr) {
    errors.push(`upload: ${uploadErr.message}`)
    return { status: 'error', rowCounts, errors }
  }

  // Prune backups older than RETENTION_DAYS — both the DB row and the file.
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString()
  const { data: stale } = await admin
    .from('platform_backups')
    .select('id, storage_path')
    .lt('created_at', cutoff)
  if (stale?.length) {
    const paths = stale.map(r => r.storage_path).filter((p): p is string => !!p)
    if (paths.length) await admin.storage.from(BUCKET).remove(paths)
    await admin.from('platform_backups').delete().in('id', stale.map(r => r.id))
  }

  return {
    status: errors.length > 0 ? 'partial' : 'success',
    storagePath: path,
    sizeBytes: buffer.length,
    rowCounts,
    errors,
  }
}
