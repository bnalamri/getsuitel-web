'use client'

interface CronLog {
  id: string
  job_name: string
  status: 'success' | 'partial' | 'error'
  summary: Record<string, unknown>
  error_msg: string | null
  duration_ms: number | null
  ran_at: string
}

interface Props {
  logs: CronLog[]
}

function formatJobName(name: string) {
  const map: Record<string, string> = {
    rent_invoicing: 'Rent Invoicing',
    org_snapshot: 'Org Snapshot',
    org_purge: 'Org Purge',
  }
  return map[name] ?? name
}

function statusLabel(s: string) {
  if (s === 'success') return '✅ Success'
  if (s === 'partial') return '⚠️ Partial'
  return '❌ Error'
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
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ') || '—'
}

export default function CronMonitorPDF({ logs }: Props) {
  function handlePrint() {
    const printDate = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    const rows = logs.map(log => `
      <tr>
        <td>${formatDate(log.ran_at)}</td>
        <td>${formatJobName(log.job_name)}</td>
        <td class="status-${log.status}">${statusLabel(log.status)}</td>
        <td>${summarize(log.summary as Record<string, unknown>)}</td>
        <td>${log.error_msg ?? '—'}</td>
        <td>${formatDuration(log.duration_ms)}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Cron Monitor Report — GetSuitel</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; background: #fff; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
  .brand { font-size: 22px; font-weight: 900; }
  .brand span { color: #b8860b; }
  .meta { text-align: right; font-size: 12px; color: #64748b; }
  h2 { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #0f172a; color: #fff; padding: 8px 10px; text-align: left; font-weight: 600; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .status-success { color: #16a34a; font-weight: 600; }
  .status-partial  { color: #d97706; font-weight: 600; }
  .status-error    { color: #dc2626; font-weight: 600; }
  .footer { margin-top: 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Get<span>Suitel</span></div>
      <div style="font-size:13px;color:#64748b;margin-top:4px">Cron Monitor Report</div>
    </div>
    <div class="meta">
      <div>Generated: ${printDate}</div>
      <div>Total entries: ${logs.length}</div>
    </div>
  </div>

  <h2>Automated Job Run History</h2>

  <table>
    <thead>
      <tr>
        <th style="width:160px">Run Time (UTC)</th>
        <th style="width:120px">Job</th>
        <th style="width:90px">Status</th>
        <th>Summary</th>
        <th style="width:160px">Error</th>
        <th style="width:70px">Duration</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px">No log entries found</td></tr>'}
    </tbody>
  </table>

  <div class="footer">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</body>
</html>`

    const w = window.open('', '_blank', 'width=1100,height=700')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  return (
    <button
      onClick={handlePrint}
      className="btn-secondary flex items-center gap-2 text-sm"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      Print / Save PDF
    </button>
  )
}
