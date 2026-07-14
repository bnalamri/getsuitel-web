import { createAdminClient } from './supabase/server'

export async function logCron({
  jobName,
  status,
  summary = {},
  errorMsg,
  durationMs,
}: {
  jobName: string
  status: 'success' | 'partial' | 'error'
  summary?: Record<string, unknown>
  errorMsg?: string
  durationMs?: number
}) {
  try {
    const admin = createAdminClient()
    await admin.from('cron_logs').insert({
      job_name: jobName,
      status,
      summary,
      error_msg: errorMsg ?? null,
      duration_ms: durationMs ?? null,
    })
  } catch (e) {
    console.error('[cron-logger] Failed to write log:', e)
  }
}
