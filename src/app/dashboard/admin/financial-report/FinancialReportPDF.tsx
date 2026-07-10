'use client'
import { TrendingUp, Download, BarChart2, CreditCard, Receipt } from 'lucide-react'

type Org     = { id: string; name: string; subscription_plan: string; subscription_status: string }
type Invoice = { organization_id: string; amount: number; currency: string; status: string; type: string; created_at: string; due_date: string }
type PayReceipt = { organization_id: string; amount: number; method: string; status: string; confirmed_at: string }

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer:   'Bank Transfer',
  mobile_transfer: 'Mobile Transfer',
  cash:            'Cash',
  cheque:          'Cheque',
}

const PLAN_COLOR: Record<string, string> = {
  basic:      'bg-slate-100 text-slate-600',
  pro:        'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

export default function FinancialReportPDF({
  orgs, invoices, receipts, printDate,
}: {
  orgs: Org[]
  invoices: Invoice[]
  receipts: PayReceipt[]
  printDate: string
}) {
  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalInvoiced   = invoices.reduce((s, i) => s + Number(i.amount), 0)
  const totalCollected  = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const totalOutstanding = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0)
  const totalOverdue    = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
  const collectionRate  = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0

  // ── By org ──────────────────────────────────────────────────────────────────
  const byOrg = orgs.map(org => {
    const orgInv     = invoices.filter(i => i.organization_id === org.id)
    const invoiced   = orgInv.reduce((s, i) => s + Number(i.amount), 0)
    const collected  = orgInv.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
    const outstanding = orgInv.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0)
    const rate       = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 0
    return { ...org, invoiced, collected, outstanding, rate, count: orgInv.length }
  }).sort((a, b) => b.invoiced - a.invoiced)

  // ── Last 6 months ───────────────────────────────────────────────────────────
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return {
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
    }
  })
  const byMonth = last6.map(m => {
    const mInv = invoices.filter(i => i.created_at?.startsWith(m.key))
    return {
      ...m,
      invoiced:  mInv.reduce((s, i) => s + Number(i.amount), 0),
      collected: mInv.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0),
      count:     mInv.length,
    }
  })
  const maxMonth = Math.max(...byMonth.map(m => m.invoiced), 1)

  // ── Payment methods (confirmed receipts) ────────────────────────────────────
  const byMethod: Record<string, number> = {}
  receipts.filter(r => r.status === 'confirmed').forEach(r => {
    byMethod[r.method] = (byMethod[r.method] ?? 0) + Number(r.amount ?? 0)
  })
  const totalByMethod = Object.values(byMethod).reduce((s, v) => s + v, 0)

  // ── Invoice types ───────────────────────────────────────────────────────────
  const byType: Record<string, { count: number; amount: number }> = {}
  invoices.forEach(i => {
    if (!byType[i.type]) byType[i.type] = { count: 0, amount: 0 }
    byType[i.type].count++
    byType[i.type].amount += Number(i.amount)
  })

  // ── PDF export ──────────────────────────────────────────────────────────────
  function handleSavePDF() {
    const orgRows = byOrg.map((o, idx) => `
      <tr>
        <td style="color:#94a3b8;font-family:monospace">${idx + 1}</td>
        <td style="font-weight:600">${o.name}</td>
        <td><span style="display:inline-block;padding:2px 6px;border-radius:99px;font-size:9px;font-weight:600;background:${o.subscription_plan === 'pro' ? '#dbeafe' : o.subscription_plan === 'enterprise' ? '#f3e8ff' : '#f1f5f9'};color:${o.subscription_plan === 'pro' ? '#1d4ed8' : o.subscription_plan === 'enterprise' ? '#7e22ce' : '#475569'}">${o.subscription_plan}</span></td>
        <td style="text-align:right">${fmt(o.invoiced)}</td>
        <td style="text-align:right;color:#15803d;font-weight:600">${fmt(o.collected)}</td>
        <td style="text-align:right;color:#c2410c">${fmt(o.outstanding)}</td>
        <td style="text-align:right;font-weight:600;color:${o.rate >= 80 ? '#15803d' : o.rate >= 50 ? '#854d0e' : '#b91c1c'}">${o.rate}%</td>
        <td style="text-align:right">${o.count}</td>
      </tr>`).join('')

    const monthRows = byMonth.map(m => `
      <tr>
        <td style="white-space:nowrap">${m.label}</td>
        <td style="text-align:right">${fmt(m.invoiced)}</td>
        <td style="text-align:right;color:#15803d;font-weight:600">${fmt(m.collected)}</td>
        <td style="text-align:right">${m.count}</td>
      </tr>`).join('')

    const methodRows = Object.entries(byMethod).length === 0
      ? `<tr><td colspan="2" style="text-align:center;color:#94a3b8;font-style:italic;padding:10px">No confirmed receipts</td></tr>`
      : Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([method, amt]) => `
      <tr>
        <td>${METHOD_LABELS[method] ?? method}</td>
        <td style="text-align:right;font-weight:600">${fmt(amt)}</td>
      </tr>`).join('')

    const typeRows = Object.entries(byType).sort((a, b) => b[1].amount - a[1].amount).map(([type, d]) => `
      <tr>
        <td style="text-transform:capitalize">${type}</td>
        <td style="text-align:right">${d.count}</td>
        <td style="text-align:right;font-weight:600">${fmt(d.amount)}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Financial Report — GetSuitel</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Arial,sans-serif; font-size:11px; color:#1e293b; padding:24px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; border-bottom:2px solid #1B3A6B; padding-bottom:12px; }
    .logo { font-size:20px; font-weight:900; color:#1B3A6B; }
    .logo span { color:#b8972f; }
    .meta { text-align:right; font-size:10px; color:#64748b; }
    h2 { font-size:14px; font-weight:700; color:#1B3A6B; margin-bottom:4px; }
    h3 { font-size:11px; font-weight:700; color:#1B3A6B; margin:16px 0 6px; text-transform:uppercase; letter-spacing:0.05em; }
    .sub { font-size:10px; color:#64748b; margin-bottom:14px; }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
    .kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; }
    .kpi-value { font-size:16px; font-weight:900; color:#1B3A6B; }
    .kpi-value.green { color:#15803d; }
    .kpi-value.orange { color:#c2410c; }
    .kpi-value.red { color:#b91c1c; }
    .kpi-label { font-size:9px; color:#64748b; margin-top:2px; text-transform:uppercase; letter-spacing:0.05em; }
    table { width:100%; border-collapse:collapse; margin-bottom:4px; }
    th { background:#1B3A6B; color:white; padding:5px 8px; text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap; }
    th.r { text-align:right; }
    td { padding:5px 8px; border-bottom:1px solid #e2e8f0; vertical-align:middle; }
    td.r { text-align:right; }
    tr:nth-child(even) td { background:#f8fafc; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .footer { margin-top:20px; text-align:center; font-size:9px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:10px; }
    @media print { body { padding:16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Get<span>Suitel</span></div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">SMART REAL ESTATE MANAGEMENT</div>
    </div>
    <div class="meta">
      <div><strong>Platform Financial Report</strong></div>
      <div>Generated: ${printDate}</div>
      <div>${orgs.length} organization${orgs.length !== 1 ? 's' : ''} · ${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}</div>
    </div>
  </div>

  <h2>Platform Financial Report</h2>
  <div class="sub">Aggregated revenue and collection performance across all organizations</div>

  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-value">${fmt(totalInvoiced)}</div><div class="kpi-label">Total Invoiced (OMR)</div></div>
    <div class="kpi"><div class="kpi-value green">${fmt(totalCollected)}</div><div class="kpi-label">Collected (OMR)</div></div>
    <div class="kpi"><div class="kpi-value orange">${fmt(totalOutstanding)}</div><div class="kpi-label">Outstanding (OMR)</div></div>
    <div class="kpi"><div class="kpi-value ${collectionRate >= 80 ? 'green' : collectionRate >= 50 ? '' : 'red'}">${collectionRate}%</div><div class="kpi-label">Collection Rate</div></div>
  </div>

  <h3>Revenue by Organization</h3>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Organization</th><th>Plan</th>
        <th class="r">Invoiced (OMR)</th><th class="r">Collected (OMR)</th>
        <th class="r">Outstanding (OMR)</th><th class="r">Rate</th><th class="r">Invoices</th>
      </tr>
    </thead>
    <tbody>
      ${byOrg.length === 0
        ? `<tr><td colspan="8" style="text-align:center;padding:14px;color:#94a3b8;font-style:italic">No invoice data yet</td></tr>`
        : orgRows}
    </tbody>
  </table>

  <div class="two-col">
    <div>
      <h3>Monthly Revenue (Last 6 Months)</h3>
      <table>
        <thead><tr><th>Month</th><th class="r">Invoiced</th><th class="r">Collected</th><th class="r">#</th></tr></thead>
        <tbody>${monthRows}</tbody>
      </table>

      <h3>Invoice Types</h3>
      <table>
        <thead><tr><th>Type</th><th class="r">Count</th><th class="r">Amount (OMR)</th></tr></thead>
        <tbody>${typeRows.length ? typeRows : '<tr><td colspan="3" style="text-align:center;color:#94a3b8;font-style:italic;padding:10px">No invoices</td></tr>'}</tbody>
      </table>
    </div>
    <div>
      <h3>Payment Methods (Confirmed)</h3>
      <table>
        <thead><tr><th>Method</th><th class="r">Amount (OMR)</th></tr></thead>
        <tbody>${methodRows}</tbody>
      </table>

      <h3>Overdue Summary</h3>
      <table>
        <thead><tr><th>Metric</th><th class="r">Value</th></tr></thead>
        <tbody>
          <tr><td>Overdue invoices</td><td style="text-align:right;color:#b91c1c;font-weight:600">${invoices.filter(i => i.status === 'overdue').length}</td></tr>
          <tr><td>Overdue amount (OMR)</td><td style="text-align:right;color:#b91c1c;font-weight:600">${fmt(totalOverdue)}</td></tr>
          <tr><td>Draft (unsent) invoices</td><td style="text-align:right">${invoices.filter(i => i.status === 'draft').length}</td></tr>
          <tr><td>Total organizations</td><td style="text-align:right;font-weight:600">${orgs.length}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="footer">GetSuitel Property Management &nbsp;•&nbsp; Confidential &nbsp;•&nbsp; ${printDate}</div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const rateColor = collectionRate >= 80 ? 'text-emerald-700' : collectionRate >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Financial Report</h2>
          <p className="text-slate-500 text-sm mt-0.5">Aggregated revenue across all organizations · {printDate}</p>
        </div>
        <button
          onClick={handleSavePDF}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-navy-700 hover:bg-navy-800 px-4 py-2 rounded-xl transition-colors"
        >
          <Download size={15} />
          Save as PDF
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-black text-slate-900">{fmt(totalInvoiced)}</div>
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">Total Invoiced (OMR)</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-black text-emerald-700">{fmt(totalCollected)}</div>
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">Collected (OMR)</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-black text-orange-600">{fmt(totalOutstanding)}</div>
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">Outstanding (OMR)</div>
        </div>
        <div className="card p-4">
          <div className={`text-2xl font-black ${rateColor}`}>{collectionRate}%</div>
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">Collection Rate</div>
        </div>
      </div>

      {/* By-org table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <BarChart2 size={16} className="text-slate-400" />
          <h3 className="font-semibold text-slate-900">Revenue by Organization</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Organization</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Plan</th>
              <th className="text-right px-4 py-3 text-slate-600 font-semibold">Invoiced</th>
              <th className="text-right px-4 py-3 text-slate-600 font-semibold">Collected</th>
              <th className="text-right px-4 py-3 text-slate-600 font-semibold">Outstanding</th>
              <th className="text-right px-4 py-3 text-slate-600 font-semibold">Rate</th>
              <th className="text-right px-4 py-3 text-slate-600 font-semibold">Invoices</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {byOrg.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">No invoice data yet</td>
              </tr>
            ) : byOrg.map(o => {
              const oRate = o.rate >= 80 ? 'text-emerald-600' : o.rate >= 50 ? 'text-amber-600' : 'text-red-600'
              return (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{o.name}</td>
                  <td className="px-4 py-3">
                    <span className={`badge capitalize ${PLAN_COLOR[o.subscription_plan] ?? 'bg-slate-100 text-slate-600'}`}>
                      {o.subscription_plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 tabular-nums">{fmt(o.invoiced)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">{fmt(o.collected)}</td>
                  <td className="px-4 py-3 text-right text-orange-600 tabular-nums">{fmt(o.outstanding)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${oRate}`}>{o.rate}%</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">{o.count}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom 3-col grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Monthly trend */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-slate-400" />Monthly Trend
          </h3>
          <div className="space-y-3">
            {byMonth.map(m => (
              <div key={m.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">{m.label}</span>
                  <span className="font-semibold text-emerald-700 tabular-nums">{fmt(m.collected)} OMR</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.max((m.invoiced / maxMonth) * 100, m.invoiced > 0 ? 2 : 0)}%` }}
                  />
                </div>
                {m.invoiced > 0 && m.collected < m.invoiced && (
                  <div className="text-right text-[10px] text-slate-400 mt-0.5">
                    {fmt(m.invoiced)} invoiced
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment methods */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-slate-400" />Payment Methods
          </h3>
          {Object.keys(byMethod).length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-8">No confirmed receipts yet</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([method, amt]) => (
                <div key={method}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{METHOD_LABELS[method] ?? method}</span>
                    <span className="font-semibold tabular-nums">{fmt(amt)} OMR</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div
                      className="h-full bg-navy-700 rounded-full"
                      style={{ width: `${(amt / totalByMethod) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoice types */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Receipt size={16} className="text-slate-400" />Invoice Types
          </h3>
          {Object.keys(byType).length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-8">No invoices yet</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(byType).sort((a, b) => b[1].amount - a[1].amount).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-slate-700 capitalize">{type}</div>
                    <div className="text-xs text-slate-400">{data.count} invoice{data.count !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900 tabular-nums">{fmt(data.amount)}</div>
                    <div className="text-xs text-slate-400">OMR</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Overdue callout */}
          {totalOverdue > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-xl">
              <div className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Overdue</div>
              <div className="text-lg font-black text-red-600 tabular-nums">{fmt(totalOverdue)} OMR</div>
              <div className="text-xs text-red-500">{invoices.filter(i => i.status === 'overdue').length} invoice{invoices.filter(i => i.status === 'overdue').length !== 1 ? 's' : ''}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
