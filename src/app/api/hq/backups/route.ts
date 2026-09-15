import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { runPlatformBackup, BACKUP_TABLES } from '@/lib/platform-backup'

// Same gate as /api/hq/config — full-platform backups touch every
// organization's data, so this stays hq_admin-only, not hq_finance/hq_staff.
async function requireHQAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'hq_admin') return null
  return user
}

// GET — list recent backups
export async function GET() {
  if (!await requireHQAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('platform_backups')
    .select('id, created_at, trigger_type, status, size_bytes, row_counts, error_msg, duration_ms')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — trigger a manual backup now
export async function POST() {
  const user = await requireHQAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const startTime = Date.now()
  const admin = createAdminClient()

  const { data: row } = await admin
    .from('platform_backups')
    .insert({ trigger_type: 'manual', triggered_by: user.id, status: 'running', tables_included: [...BACKUP_TABLES] })
    .select('id')
    .single()

  const result = await runPlatformBackup()
  const durationMs = Date.now() - startTime

  if (row?.id) {
    await admin
      .from('platform_backups')
      .update({
        status: result.status,
        storage_path: result.storagePath ?? null,
        size_bytes: result.sizeBytes ?? null,
        row_counts: result.rowCounts,
        error_msg: result.errors.length ? result.errors.join(' | ') : null,
        duration_ms: durationMs,
      })
      .eq('id', row.id)
  }

  return NextResponse.json({ ok: result.status !== 'error', ...result })
}
