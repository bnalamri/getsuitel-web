/**
 * POST /api/hq/backups/[id]/restore
 * Body: { confirm: string }  — must exactly match the backup's created_at
 * ISO string, same "type to confirm" pattern as the owners page's Force
 * Purge button, so this can't be triggered by an accidental click.
 *
 * Restore is UPSERT-based, not delete-then-reinsert:
 *   - Every row from the backup is written back with
 *     `.upsert(rows, { onConflict: 'id' })`, table by table, parents before
 *     children (RESTORE_TABLES order).
 *   - A row that still exists gets overwritten back to its backed-up
 *     state (undoes bad edits/corruption to existing data).
 *   - A row that existed at backup time but was hard-deleted since gets
 *     reinserted (undoes an accidental delete).
 *   - A row created AFTER the backup is left alone — restore does not
 *     delete anything, on purpose. A full wipe-then-replace would also
 *     erase every legitimate signup/contract/invoice created since the
 *     backup, which is a much bigger risk than the incident you're
 *     trying to recover from. This is a point-in-time *content* restore,
 *     not a time-machine reset to an exact past state.
 *   - `profiles` is never touched — see the note in
 *     src/lib/platform-backup.ts. Restoring it automatically risks
 *     breaking login for anyone who signed up after the backup.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { RESTORE_TABLES, GENERATED_COLUMNS } from '@/lib/platform-backup'

const BUCKET = 'platform-backups'

async function requireHQAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'hq_admin') return null
  return user
}

const CHUNK = 500

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireHQAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { confirm } = await req.json().catch(() => ({ confirm: '' }))

  const admin = createAdminClient()
  const { data: backup, error: backupErr } = await admin
    .from('platform_backups')
    .select('id, created_at, storage_path, status')
    .eq('id', id)
    .single()

  if (backupErr || !backup?.storage_path) {
    return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
  }
  if (backup.status !== 'success' && backup.status !== 'partial') {
    return NextResponse.json({ error: 'This backup did not complete successfully — refusing to restore from it' }, { status: 400 })
  }
  if (confirm !== backup.created_at) {
    return NextResponse.json({ error: 'Confirmation text did not match the backup timestamp' }, { status: 400 })
  }

  const { data: fileBlob, error: dlErr } = await admin.storage.from(BUCKET).download(backup.storage_path)
  if (dlErr || !fileBlob) {
    return NextResponse.json({ error: dlErr?.message ?? 'Could not download backup file' }, { status: 500 })
  }

  let parsed: { tables: Record<string, unknown[]> }
  try {
    parsed = JSON.parse(await fileBlob.text())
  } catch (e) {
    return NextResponse.json({ error: `Backup file is not valid JSON: ${String(e)}` }, { status: 500 })
  }

  const restoreCounts: Record<string, number> = {}
  const errors: string[] = []

  for (const table of RESTORE_TABLES) {
    const rows = parsed.tables[table]
    if (!rows || rows.length === 0) {
      restoreCounts[table] = 0
      continue
    }
    const dropCols = GENERATED_COLUMNS[table]
    const cleanRows = dropCols
      ? rows.map(row => {
          const copy = { ...(row as Record<string, unknown>) }
          for (const col of dropCols) delete copy[col]
          return copy
        })
      : rows
    let restored = 0
    for (let i = 0; i < cleanRows.length; i += CHUNK) {
      const chunk = cleanRows.slice(i, i + CHUNK)
      const { error } = await admin.from(table).upsert(chunk, { onConflict: 'id' })
      if (error) {
        errors.push(`${table}: ${error.message}`)
      } else {
        restored += chunk.length
      }
    }
    restoreCounts[table] = restored
  }

  // Audit log — best-effort, never blocks the response for a restore that
  // already ran. branch_id is intentionally null: this is platform-wide,
  // not scoped to one branch.
  try {
    await admin.from('hq_audit_logs').insert({
      branch_id: null,
      actor_id: user.id,
      action: 'platform_restore',
      details: { backupId: id, backupCreatedAt: backup.created_at, restoreCounts, errorCount: errors.length },
    })
  } catch {
    // non-fatal
  }

  return NextResponse.json({
    ok: errors.length === 0,
    backupCreatedAt: backup.created_at,
    restoreCounts,
    errors,
  })
}
