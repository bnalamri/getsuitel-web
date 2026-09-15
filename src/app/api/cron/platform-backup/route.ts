/**
 * Daily full-platform backup cron — GET /api/cron/platform-backup
 * Runs once a day (see vercel.json). Free-tier stand-in for Supabase's
 * "Daily backups" (Pro-only feature) — see src/lib/platform-backup.ts.
 */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { runPlatformBackup, BACKUP_TABLES } from '@/lib/platform-backup'
import { logCron } from '@/lib/cron-logger'

const CRON_SECRET = process.env.CRON_SECRET
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const isCron = (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`)
             || (SERVICE_KEY && authHeader === `Bearer ${SERVICE_KEY}`)
  if (!isCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const admin = createAdminClient()

  const { data: row } = await admin
    .from('platform_backups')
    .insert({ trigger_type: 'cron', status: 'running', tables_included: [...BACKUP_TABLES] })
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

  await logCron({
    jobName: 'platform_backup',
    status: result.status,
    summary: { rowCounts: result.rowCounts, sizeBytes: result.sizeBytes },
    errorMsg: result.errors.length ? result.errors.join(' | ') : undefined,
    durationMs,
  })

  return NextResponse.json({ ok: result.status !== 'error', ...result })
}
