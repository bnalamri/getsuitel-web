'use client'
import { TrendingUp, Download, BarChart2, CreditCard, Receipt, Layers, FileSpreadsheet } from 'lucide-react'

type Org        = { id: string; name: string; subscription_plan: string; subscription_status: string; subscription_expires_at?: string; default_currency?: string }
type Invoice    = { organization_id: string; amount: number; currency: string; status: string; type: string; created_at: string; due_date: string }
type PayReceipt = { organization_id: string; amount: number; method: string; status: string; confirmed_at: string }
type Proof      = { plan: string; status: string; submitted_at: string; amount: number; currency: string }

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
  orgs, invoices, receipts, proofs, printDate, printerName = 'Unknown',
}: {
  orgs: Org[]
  invoices: Invoice[]
  receipts: PayReceipt[]
  proofs: Proof[]
  printDate: string
  printerName?: string
}) {
  // ── Per-currency rental revenue (never mix currencies) ──────────────────────
  const rentalCurrencies = [...new Set(invoices.map(i => i.currency))].sort()
  const byCurrency = rentalCurrencies.map(currency => {
    const cInv        = invoices.filter(i => i.currency === currency)
    const invoiced    = cInv.reduce((s, i) => s + Number(i.amount), 0)
    const collected   = cInv.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
    const outstanding = cInv.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0)
    const overdue     = cInv.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)
    const rate        = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 0
    return { currency, invoiced, collected, outstanding, overdue, rate, count: cInv.length }
  })

  // Primary currency (most invoices) — used for single KPI display
  const primary = byCurrency.sort((a, b) => b.count - a.count)[0]

  // Total overdue across all currencies (used as an alert indicator)
  const totalOverdue = byCurrency.reduce((s, c) => s + c.overdue, 0)

  // ── By org ──────────────────────────────────────────────────────────────────
  const byOrg = orgs.map(org => {
    const orgInv      = invoices.filter(i => i.organization_id === org.id)
    const currency    = orgInv[0]?.currency ?? org.default_currency ?? '—'
    const invoiced    = orgInv.reduce((s, i) => s + Number(i.amount), 0)
    const collected   = orgInv.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
    const outstanding = orgInv.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0)
    const rate        = invoiced > 0 ? Math.round((collected / invoiced) * 100) : 0
    return { ...org, currency, invoiced, collected, outstanding, rate, count: orgInv.length }
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

  // ── Subscription metrics (always USD) ───────────────────────────────────────
  // MRR = active orgs × their plan price in USD
  const PLAN_PRICE_USD: Record<string, number> = { basic: 29, pro: 79, enterprise: 199 }
  const activeOrgs  = orgs.filter(o => o.subscription_status === 'active')
  const mrr         = activeOrgs.reduce((s, o) => s + (PLAN_PRICE_USD[o.subscription_plan] ?? 0), 0)
  const arr         = mrr * 12

  // Revenue received = actual amounts from reviewed proofs (grouped by currency)
  const reviewedProofs = proofs.filter(p => p.status === 'reviewed')
  const pendingProofs  = proofs.filter(p => p.status === 'pending')

  // Group proof revenue by currency
  const subRevByCurrency: Record<string, number> = {}
  reviewedProofs.forEach(p => {
    const c = p.currency || 'USD'
    subRevByCurrency[c] = (subRevByCurrency[c] ?? 0) + Number(p.amount ?? 0)
  })
  const subPendingByCurrency: Record<string, number> = {}
  pendingProofs.forEach(p => {
    const c = p.currency || 'USD'
    subPendingByCurrency[c] = (subPendingByCurrency[c] ?? 0) + Number(p.amount ?? 0)
  })

  // ── PDF scalar aggregates (primary currency) ────────────────────────────────
  // Used in the PDF template which needs single values per section
  const totalInvoiced    = primary?.invoiced    ?? 0
  const totalCollected   = primary?.collected   ?? 0
  const totalOutstanding = primary?.outstanding ?? 0
  const collectionRate   = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0

  // Subscription revenue scalars (USD first, fallback to sum)
  const subRevenueReceived = subRevByCurrency['USD'] ?? Object.values(subRevByCurrency).reduce((s, v) => s + v, 0)
  const subRevenuePending  = subPendingByCurrency['USD'] ?? Object.values(subPendingByCurrency).reduce((s, v) => s + v, 0)

  // Per-plan breakdown (MRR uses USD plan prices)
  const planBreakdown = ['basic', 'pro', 'enterprise'].map(plan => {
    const planOrgs       = orgs.filter(o => o.subscription_plan === plan)
    const activePlanOrgs = planOrgs.filter(o => o.subscription_status === 'active')
    return {
      plan,
      total:  planOrgs.length,
      active: activePlanOrgs.length,
      mrr:    activePlanOrgs.length * (PLAN_PRICE_USD[plan] ?? 0),
      price:  PLAN_PRICE_USD[plan] ?? 0,
    }
  })

  // Proof submissions by month (last 6)
  const subByMonth = last6.map(m => {
    const mProofs = proofs.filter(p => p.submitted_at?.startsWith(m.key))
    const mReviewed = mProofs.filter(p => p.status === 'reviewed')
    return {
      ...m,
      submitted: mProofs.length,
      reviewed:  mReviewed.length,
      revenue:   mReviewed.reduce((s, p) => s + Number(p.amount ?? 0), 0),
      currency:  mReviewed[0]?.currency ?? 'USD',
    }
  })


  // ── Excel export (SheetJS loaded from CDN) ─────────────────────────────────
  async function handleExportExcel() {
    // Dynamically load SheetJS from CDN
    const XLSX: any = await new Promise((resolve, reject) => {
      if ((window as any).XLSX) { resolve((window as any).XLSX); return }
      const s = document.createElement('script')
      s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
      s.onload = () => resolve((window as any).XLSX)
      s.onerror = reject
      document.head.appendChild(s)
    })

    const wb = XLSX.utils.book_new()

    // ── Sheet 1: Summary ──────────────────────────────────────────────────────
    const summaryData = [
      ['GetSuitel — Financial Report', '', '', ''],
      ['Generated', printDate, '', ''],
      ['', '', '', ''],
      ['RENTAL REVENUE SUMMARY', '', '', ''],
      ['Currency', 'Invoiced', 'Collected', 'Outstanding', 'Collection Rate', 'Invoices'],
      ...byCurrency.map(c => [c.currency, c.invoiced, c.collected, c.outstanding, `${c.rate}%`, c.count]),
      ['', '', '', ''],
      ['SUBSCRIPTION REVENUE SUMMARY', '', '', ''],
      ['MRR (USD)', mrr],
      ['ARR (USD)', arr],
      ...Object.entries(subRevByCurrency).map(([c, v]) => [`Payments Received (${c})`, v]),
      ...Object.entries(subPendingByCurrency).map(([c, v]) => [`Pending Payments (${c})`, v]),
      ['', '', '', ''],
      ['SUBSCRIPTION STATUS', '', '', ''],
      ['Status', 'Count'],
      ['Active',   orgs.filter(o => o.subscription_status === 'active').length],
      ['Trialing', orgs.filter(o => o.subscription_status === 'trialing').length],
      ['Past Due', orgs.filter(o => o.subscription_status === 'past_due').length],
      ['Canceled', orgs.filter(o => o.subscription_status === 'canceled').length],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    ws1['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary')

    // ── Sheet 2: By Organization ──────────────────────────────────────────────
    const orgData = [
      ['Organization', 'Plan', 'Status', 'Currency', 'Invoiced', 'Collected', 'Outstanding', 'Collection Rate', 'Invoices'],
      ...byOrg.map(o => [
        o.name,
        o.subscription_plan,
        o.subscription_status,
        o.currency,
        o.invoiced,
        o.collected,
        o.outstanding,
        `${o.rate}%`,
        o.count,
      ]),
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(orgData)
    ws2['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'By Organization')

    // ── Sheet 3: Monthly Trend ────────────────────────────────────────────────
    const monthData = [
      ['Month', 'Invoiced', 'Collected', 'Invoices'],
      ...byMonth.map(m => [m.label, m.invoiced, m.collected, m.count]),
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(monthData)
    ws3['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Monthly Trend')

    // ── Sheet 4: Subscription Plans ───────────────────────────────────────────
    const planData = [
      ['Plan', 'Price/mo (USD)', 'Total Orgs', 'Active Orgs', 'MRR (USD)'],
      ...planBreakdown.map(p => [p.plan, p.price, p.total, p.active, p.mrr]),
      ['', '', '', 'Total MRR', mrr],
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(planData)
    ws4['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws4, 'Subscription Plans')

    // Download
    const today = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `GetSuitel_Financial_Report_${today}.xlsx`)
  }

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

    const planRows = planBreakdown.map(p => `
      <tr>
        <td style="text-transform:capitalize;font-weight:600">${p.plan}</td>
        <td style="text-align:right">${p.price} OMR/mo</td>
        <td style="text-align:right">${p.total}</td>
        <td style="text-align:right;color:#15803d;font-weight:600">${p.active}</td>
        <td style="text-align:right;font-weight:700;color:#1B3A6B">${p.mrr.toLocaleString()} OMR</td>
      </tr>`).join('')

    const subMonthRows = subByMonth.map(m => `
      <tr>
        <td style="white-space:nowrap">${m.label}</td>
        <td style="text-align:right">${m.submitted}</td>
        <td style="text-align:right;color:#15803d;font-weight:600">${m.reviewed}</td>
        <td style="text-align:right;font-weight:600">${m.revenue.toLocaleString()} OMR</td>
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

  <div style="margin-bottom:16px;border:1.5px solid #dc2626;border-radius:6px;padding:10px 14px;background:#fff5f5;text-align:center;">
    <div style="font-size:11px;font-weight:700;color:#dc2626;letter-spacing:0.05em;">STRICTLY CONFIDENTIAL &nbsp;·&nbsp; سري للغاية</div>
    <div style="font-size:9px;color:#7f1d1d;margin-top:4px;line-height:1.6;">
      This document is intended solely for authorised internal use within the organisation.
      Unauthorised disclosure, copying, distribution or use of this information is strictly prohibited.
    </div>
    <div style="font-size:9px;color:#7f1d1d;margin-top:2px;line-height:1.6;">
      هذه الوثيقة مخصصة للاستعمال الداخلي المصرح به داخل المؤسسة فقط. يُحظر تمامًا الإفصاح أو النسخ أو التوزيع أو استخدام هذه المعلومات بدون إذن.
    </div>
    <div dir="ltr" style="font-size:9px;color:#64748b;margin-top:8px;border-top:1px solid #fecaca;padding-top:6px;">
      Printed by: <strong style="unicode-bidi:isolate">${printerName}</strong> &nbsp;·&nbsp; <span style="unicode-bidi:isolate">${printDate}</span> &nbsp;·&nbsp; GetSuitel Platform Report
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

  <div style="page-break-before:always"></div>

  <h3>Platform Subscription Revenue</h3>
  <div class="kpi-grid" style="margin-bottom:16px">
    <div class="kpi"><div class="kpi-value">${mrr.toLocaleString()}</div><div class="kpi-label">MRR (OMR)</div></div>
    <div class="kpi"><div class="kpi-value green">${arr.toLocaleString()}</div><div class="kpi-label">ARR (OMR)</div></div>
    <div class="kpi"><div class="kpi-value">${subRevenueReceived.toLocaleString()}</div><div class="kpi-label">Payments Received (OMR)</div></div>
    <div class="kpi"><div class="kpi-value orange">${subRevenuePending.toLocaleString()}</div><div class="kpi-label">Pending Payments (OMR)</div></div>
  </div>

  <div class="two-col">
    <div>
      <h3>Revenue by Plan</h3>
      <table>
        <thead><tr><th>Plan</th><th class="r">Price</th><th class="r">Total Orgs</th><th class="r">Active</th><th class="r">MRR (OMR)</th></tr></thead>
        <tbody>${planRows}</tbody>
      </table>
    </div>
    <div>
      <h3>Subscription Payments by Month</h3>
      <table>
        <thead><tr><th>Month</th><th class="r">Submitted</th><th class="r">Approved</th><th class="r">Revenue (OMR)</th></tr></thead>
        <tbody>${subMonthRows.length ? subMonthRows : '<tr><td colspan="4" style="text-align:center;color:#94a3b8;font-style:italic;padding:10px">No data</td></tr>'}</tbody>
      </table>

      <h3>Subscription Status Summary</h3>
      <table>
        <thead><tr><th>Status</th><th class="r">Count</th></tr></thead>
        <tbody>
          ${['active','trialing','past_due','canceled'].map(s => `
          <tr>
            <td style="text-transform:capitalize">${s.replace('_',' ')}</td>
            <td style="text-align:right;font-weight:600">${orgs.filter(o => o.subscription_status === s).length}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div style="margin-top:20px;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;">
    GetSuitel Platform Report &nbsp;·&nbsp; ${printDate}
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Financial Report</h2>
          <p className="text-slate-500 text-sm mt-0.5">Aggregated revenue across all organizations · {printDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSavePDF}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-navy-700 hover:bg-navy-800 px-4 py-2 rounded-xl transition-colors"
          >
            <Download size={15} />
            Save as PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl transition-colors"
          >
            <FileSpreadsheet size={15} />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Per-currency KPI summary */}
      {byCurrency.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">No invoice data yet</div>
      ) : (
        <div className="space-y-4">
          {byCurrency.map(c => {
            const rateColor = c.rate >= 80 ? 'text-emerald-700' : c.rate >= 50 ? 'text-amber-600' : 'text-red-600'
            return (
              <div key={c.currency}>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{c.currency} — {c.count} invoice{c.count !== 1 ? 's' : ''}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card p-4">
                    <div className="text-2xl font-black text-slate-900">{fmt(c.invoiced)}</div>
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">Invoiced ({c.currency})</div>
                  </div>
                  <div className="card p-4">
                    <div className="text-2xl font-black text-emerald-700">{fmt(c.collected)}</div>
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">Collected ({c.currency})</div>
                  </div>
                  <div className="card p-4">
                    <div className="text-2xl font-black text-orange-600">{fmt(c.outstanding)}</div>
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">Outstanding ({c.currency})</div>
                  </div>
                  <div className="card p-4">
                    <div className={`text-2xl font-black ${rateColor}`}>{c.rate}%</div>
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">Collection Rate</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* By-org table */}
      <div className="card overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <BarChart2 size={16} className="text-slate-400" />
          <h3 className="font-semibold text-slate-900">Revenue by Organization</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Organization</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Plan</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Currency</th>
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
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">No invoice data yet</td>
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
                  <td className="px-4 py-3">
                    <span className="badge bg-slate-100 text-slate-600 font-mono text-xs">{o.currency}</span>
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

      {/* ── Subscription Revenue section ─────────────────────────────────── */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Layers size={18} className="text-navy-700" />Platform Subscription Revenue
        </h3>

        {/* Subscription KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 border-t-2 border-navy-700">
            <div className="text-2xl font-black text-navy-700">${mrr.toLocaleString()}</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">MRR (USD)</div>
          </div>
          <div className="card p-4 border-t-2 border-emerald-500">
            <div className="text-2xl font-black text-emerald-700">${arr.toLocaleString()}</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">ARR (USD)</div>
          </div>
          <div className="card p-4 border-t-2 border-blue-400">
            <div className="space-y-0.5">
              {Object.keys(subRevByCurrency).length === 0
                ? <div className="text-2xl font-black text-blue-700">—</div>
                : Object.entries(subRevByCurrency).map(([c, v]) => (
                  <div key={c} className="text-lg font-black text-blue-700">{v.toLocaleString()} <span className="text-sm font-semibold">{c}</span></div>
                ))}
            </div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">Payments Received</div>
          </div>
          <div className="card p-4 border-t-2 border-amber-400">
            <div className="space-y-0.5">
              {Object.keys(subPendingByCurrency).length === 0
                ? <div className="text-2xl font-black text-amber-600">—</div>
                : Object.entries(subPendingByCurrency).map(([c, v]) => (
                  <div key={c} className="text-lg font-black text-amber-600">{v.toLocaleString()} <span className="text-sm font-semibold">{c}</span></div>
                ))}
            </div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">Pending Payments</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Plan breakdown table */}
          <div className="card overflow-x-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <CreditCard size={15} className="text-slate-400" />
              <h4 className="font-semibold text-slate-900">Revenue by Plan</h4>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Plan</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-semibold">Price/mo</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-semibold">Total</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-semibold">Active</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-semibold">MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {planBreakdown.map(p => (
                  <tr key={p.plan} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`badge capitalize ${PLAN_COLOR[p.plan] ?? 'bg-slate-100 text-slate-600'}`}>{p.plan}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 tabular-nums">{p.price} OMR</td>
                    <td className="px-4 py-3 text-right text-slate-700">{p.total}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{p.active}</td>
                    <td className="px-4 py-3 text-right font-bold text-navy-700 tabular-nums">{p.mrr.toLocaleString()} OMR</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-3 text-slate-700" colSpan={4}>Total MRR</td>
                  <td className="px-4 py-3 text-right font-black text-navy-700 tabular-nums">{mrr.toLocaleString()} OMR</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Subscription payments by month */}
          <div className="card overflow-x-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <TrendingUp size={15} className="text-slate-400" />
              <h4 className="font-semibold text-slate-900">Subscription Payments by Month</h4>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Month</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-semibold">Submitted</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-semibold">Approved</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subByMonth.map(m => (
                  <tr key={m.key} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{m.label}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{m.submitted || '—'}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold">{m.reviewed || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">
                      {m.revenue > 0 ? `${m.revenue.toLocaleString()} OMR` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
