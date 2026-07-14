import { requireSuperadmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CronMonitorPDF from './CronMonitorPDF'

interface CronLog {
  id: string
  job_name: string
  status: 'success' | 'partial' | 'error'
  summary: Record<string, unknown>
  error_msg: string | null
  duration_ms: number | null
  ran_at: string
}

const JOB_META: Record<string, { label: string; schedule: string; description: string }> = {
  rent_invoicing: {
    label: 'Rent Invoicing',
    schedule: 'Daily at 00:00 UTC',
    description: 'Auto-generates rent invoices, marks overdue, notifies tenants',
  },
  org_snapshot: {
    label: 'Org Snapshot',
    schedule: 'Daily at 02:00 UTC',
    description: 'Backs up all org data (7-day rolling window)',
  },
  org_purge: {
    label: 'Org Purge',
    schedule: 'Daily at 03:00 UTC',
    description: 'Sends 7-day warnings and purges accounts 90+ days after cancellation',
  },
}

function statusBadge(status: string) {
  if (status === 'success') return <span className="badge-success">Success</span>
  if (status === 'partial')  return <span className="badge-warning">Partial</span>
  return <span className="badge-danger">Error</span>
}

function formatDuration(ms: number | null) {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function summarize(summary: Record<string, unknown>) {
  return Object.entries(summary)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    .join(' · ') || '—'
}

export default async function CronMonitorPage() {
  const auth = await requireSuperadmin()
  if (!auth.ok) redirect('/login')

  const admin = createAdminClient()

  // Last run per job
  const { data: lastRuns } = await admin
    .from('cron_logs')
    .select('*')
    .order('ran_at', { ascending: false })
    .limit(300)

  const logs: CronLog[] = (lastRuns ?? []) as CronLog[]

  // Derive last run per job for status cards
  const lastPerJob: Record<string, CronLog> = {}
  for (const log of logs) {
    if (!lastPerJob[log.job_name]) lastPerJob[log.job_name] = log
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cron Monitor</h1>
          <p className="text-sm text-slate-500 mt-1">Automated job status and run history</p>
        </div>
        <CronMonitorPDF logs={logs} />
      </div>

      {/* Status cards — one per known job */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(JOB_META).map(([jobName, meta]) => {
          const last = lastPerJob[jobName]
          return (
            <div key={jobName} className="card p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold text-slate-900">{meta.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{meta.schedule}</div>
                </div>
                {last ? statusBadge(last.status) : (
                  <span className="text-xs text-slate-400 font-medium">Never run</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">{meta.description}</p>
              {last && (
                <div className="text-xs text-slate-600 space-y-1">
                  <div><span className="font-medium">Last run:</span> {formatDate(last.ran_at)}</div>
                  <div><span className="font-medium">Duration:</span> {formatDuration(last.duration_ms)}</div>
                  <div><span className="font-medium">Summary:</span> {summarize(last.summary)}</div>
                  {last.error_msg && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                      {last.error_msg}
                    </div>
                  )}
                </div>
              )}
              {!last && (
                <p className="text-xs text-slate-400 italic">No runs recorded yet.</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Full log table */}
      <div className="card">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Run History</h2>
          <p className="text-xs text-slate-500 mt-0.5">Last 300 entries · newest first</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Run Time (UTC)</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Job</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Summary</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Error</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                    No cron runs recorded yet. Logs will appear after the first scheduled job executes.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap font-mono">
                      {formatDate(log.ran_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">
                        {JOB_META[log.job_name]?.label ?? log.job_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(log.status)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {summarize(log.summary)}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-600 max-w-xs">
                      {log.error_msg ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatDuration(log.duration_ms)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
