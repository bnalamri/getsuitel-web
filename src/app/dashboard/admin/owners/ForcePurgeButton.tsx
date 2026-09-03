'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle, X, DollarSign, ReceiptText, ShieldAlert, FileDown } from 'lucide-react'

async function loadJSZip(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).JSZip) { resolve((window as any).JSZip); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
    s.onload = () => resolve((window as any).JSZip)
    s.onerror = reject
    document.head.appendChild(s)
  })
}

function esc(v: string | number | null | undefined) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// Style indices: 0=normal 1=header 2=number 3=alt 4=alt-number
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3">
  <font><sz val="11"/><name val="Calibri"/></font>
  <font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>
  <font><sz val="11"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
  <fill><patternFill patternType="none"/></fill>
  <fill><patternFill patternType="gray125"/></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FF1E3A5F"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFF0F4F8"/></patternFill></fill>
</fills>
<borders count="2">
  <border><left/><right/><top/><bottom/><diagonal/></border>
  <border><left style="thin"><color rgb="FFCBD5E0"/></left><right style="thin"><color rgb="FFCBD5E0"/></right><top style="thin"><color rgb="FFCBD5E0"/></top><bottom style="thin"><color rgb="FFCBD5E0"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
  <xf numFmtId="0"  fontId="0" fillId="0" borderId="1" xfId="0"><alignment wrapText="0"/></xf>
  <xf numFmtId="0"  fontId="1" fillId="2" borderId="1" xfId="0"><alignment horizontal="center"/></xf>
  <xf numFmtId="2"  fontId="0" fillId="0" borderId="1" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="0"  fontId="0" fillId="3" borderId="1" xfId="0"/>
  <xf numFmtId="2"  fontId="0" fillId="3" borderId="1" xfId="0"><alignment horizontal="right"/></xf>
</cellXfs>
</styleSheet>`

function cell(v: string | number | null | undefined, styleIdx = 0) {
  if (typeof v === 'number') {
    return `<c s="${styleIdx}"><v>${v}</v></c>`
  }
  return `<c t="inlineStr" s="${styleIdx}"><is><t>${esc(v)}</t></is></c>`
}

function buildSheet(headers: string[], rows: (string | number | null)[][], colWidths?: number[]): string {
  const hdrRow = `<row>${headers.map(h => cell(h, 1)).join('')}</row>`
  const dataRows = rows.map((r, ri) =>
    `<row>${r.map(v => {
      const isNum = typeof v === 'number'
      const alt   = ri % 2 === 1
      const s = isNum ? (alt ? 4 : 2) : (alt ? 3 : 0)
      return cell(v, s)
    }).join('')}</row>`
  ).join('')

  const cols = colWidths
    ? `<cols>${colWidths.map((w,i) => `<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${cols}<sheetData>${hdrRow}${dataRows}</sheetData>
<sheetView showGridLines="1" workbookViewId="0"/>
</worksheet>`
}

async function exportOrgToExcel(orgId: string, orgName: string) {
  const res  = await fetch(`/api/admin/org-export?orgId=${orgId}`)
  const data = await res.json()
  const JSZip = await loadJSZip()
  const zip   = new JSZip()

  const { org, invoices, expenses, proofs, maintenance, properties, units, tenants, exportedAt } = data
  const owner = org?.profiles

  zip.file('xl/styles.xml', STYLES_XML)

  // Sheet 1 — Summary
  const summaryRows: (string | number | null)[][] = [
    ['Organization', org?.name ?? ''],
    ['Arabic Name',  org?.name_ar ?? ''],
    ['Owner',        owner?.full_name ?? ''],
    ['Email',        owner?.email ?? ''],
    ['Phone',        owner?.phone ?? ''],
    ['Plan',         org?.subscription_plan ?? ''],
    ['Status',       org?.subscription_status ?? ''],
    ['Country',      org?.country ?? ''],
    ['Joined',       org?.created_at?.slice(0,10) ?? ''],
    ['Canceled',     org?.canceled_at?.slice(0,10) ?? ''],
    ['Exported At',  exportedAt?.slice(0,19).replace('T',' ') ?? ''],
    [],
    ['Properties', properties?.length ?? 0],
    ['Units',      units?.length ?? 0],
    ['Tenants',    tenants?.length ?? 0],
    ['Invoices',   invoices?.length ?? 0],
    ['Expenses',   expenses?.length ?? 0],
  ]
  zip.file('xl/worksheets/sheet1.xml', buildSheet(['Field','Value'], summaryRows, [28, 36]))

  // Sheet 2 — Invoices
  const invRows = (invoices ?? []).map((i: any) => [
    i.description ?? '—', Number(i.amount), i.currency, i.status,
    i.due_date?.slice(0,10) ?? '', i.paid_date?.slice(0,10) ?? '', i.created_at?.slice(0,10) ?? '',
  ])
  zip.file('xl/worksheets/sheet2.xml', buildSheet(
    ['Description','Amount','Currency','Status','Due Date','Paid Date','Created'],
    invRows, [32, 14, 12, 12, 14, 14, 14]
  ))

  // Sheet 3 — Subscription Payments
  const proofRows = (proofs ?? []).map((p: any) => [
    Number(p.amount), p.currency, p.status,
    p.submitted_at?.slice(0,10) ?? '', p.reviewed_at?.slice(0,10) ?? '', p.notes ?? '',
  ])
  zip.file('xl/worksheets/sheet3.xml', buildSheet(
    ['Amount','Currency','Status','Submitted','Reviewed','Notes'],
    proofRows, [14, 12, 12, 14, 14, 36]
  ))

  // Sheet 4 — Expenses
  const expRows = (expenses ?? []).map((e: any) => [
    e.category, e.description ?? '—', Number(e.amount), e.currency, e.date?.slice(0,10) ?? '',
  ])
  zip.file('xl/worksheets/sheet4.xml', buildSheet(
    ['Category','Description','Amount','Currency','Date'],
    expRows, [18, 36, 14, 12, 14]
  ))

  // Sheet 5 — Maintenance
  const mntRows = (maintenance ?? []).map((m: any) => [
    m.title, m.status, Number(m.charge_amount ?? 0), m.charge_payer ?? '—',
    m.completed_at?.slice(0,10) ?? '', m.created_at?.slice(0,10) ?? '',
  ])
  zip.file('xl/worksheets/sheet5.xml', buildSheet(
    ['Title','Status','Charge (OMR)','Payer','Completed','Created'],
    mntRows, [36, 14, 16, 14, 14, 14]
  ))

  // Workbook + relationships
  const sheetNames = ['Summary','Invoices','Subscription Payments','Expenses','Maintenance']
  const wbSheets = sheetNames.map((n,i) =>
    `<sheet name="${esc(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`
  ).join('')
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${wbSheets}</sheets></workbook>`)

  const wbRels = sheetNames.map((_,i) =>
    `<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`
  ).join('')
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRels}</Relationships>`)

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`)

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml"  ContentType="application/xml"/>
${sheetNames.map((_,i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml"   ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  const safe = orgName.replace(/[^a-z0-9]/gi, '_')
  a.href     = url
  a.download = `${safe}_export_${new Date().toISOString().slice(0,10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

type FinancialSummary = {
  subscriptionCollected: number
  subscriptionCurrency: string
  pendingProofs: number
  rentalCollected: number
  unpaidCount: number
  unpaidAmount: number
}

export default function ForcePurgeButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [open, setOpen]               = useState(false)
  const [loading, setLoading]         = useState(false)
  const [loadingFinancial, setLoadingFinancial] = useState(false)
  const [exportingExcel, setExportingExcel]     = useState(false)
  const [error, setError]             = useState('')
  const [confirm, setConfirm]         = useState('')
  const [financial, setFinancial]     = useState<FinancialSummary | null>(null)
  const router = useRouter()

  async function handleExport() {
    setExportingExcel(true)
    try { await exportOrgToExcel(orgId, orgName) } catch (e) { console.error(e) }
    setExportingExcel(false)
  }

  // Fetch financial summary when modal opens
  useEffect(() => {
    if (!open) return
    setLoadingFinancial(true)
    fetch(`/api/admin/org-financial-summary?orgId=${orgId}`)
      .then(r => r.json())
      .then(d => setFinancial(d))
      .catch(() => setFinancial(null))
      .finally(() => setLoadingFinancial(false))
  }, [open, orgId])

  function handleClose() {
    setOpen(false)
    setConfirm('')
    setError('')
    setFinancial(null)
  }

  async function handlePurge() {
    if (confirm !== orgName) { setError('Organization name does not match.'); return }
    setError('')
    setLoading(true)
    const res = await fetch('/api/admin/purge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error || 'Purge failed.'); return }
    handleClose()
    router.refresh()
  }

  const hasFinancialRisk = financial && (financial.pendingProofs > 0 || financial.unpaidCount > 0)

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
      title="Permanently delete all org data"
    >
      <Trash2 size={13} /> Force Purge
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-red-100 bg-red-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600" />
            <h2 className="font-bold text-red-900">Force Purge</h2>
          </div>
          <button onClick={handleClose} className="text-red-400 hover:text-red-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Org name */}
          <div className="text-sm text-slate-700 space-y-2">
            <p>This will <strong className="text-red-700">permanently delete</strong> all data for:</p>
            <p className="font-bold text-slate-900 bg-slate-100 px-3 py-2 rounded-lg">{orgName}</p>
            <p className="text-xs text-slate-500">Properties, units, tenants, contracts, invoices, maintenance records and the organization itself will all be deleted. This cannot be undone.</p>
          </div>

          {/* Financial summary */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
              <ReceiptText size={14} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Financial Summary</span>
            </div>

            {loadingFinancial ? (
              <div className="flex items-center justify-center py-6 gap-2 text-slate-400 text-sm">
                <Loader2 size={14} className="animate-spin" /> Loading...
              </div>
            ) : financial ? (
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-slate-500 flex items-center gap-1.5"><DollarSign size={13} />Subscription collected</span>
                  <span className="font-semibold text-slate-800">
                    {financial.subscriptionCollected.toFixed(2)} {financial.subscriptionCurrency}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-slate-500 flex items-center gap-1.5"><DollarSign size={13} />Rental revenue collected</span>
                  <span className="font-semibold text-slate-800">{financial.rentalCollected.toFixed(3)} OMR</span>
                </div>

                {financial.pendingProofs > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5 text-sm bg-amber-50">
                    <span className="text-amber-700 flex items-center gap-1.5"><ShieldAlert size={13} />Pending payment proofs</span>
                    <span className="font-bold text-amber-700">{financial.pendingProofs} unreviewed</span>
                  </div>
                )}

                {financial.unpaidCount > 0 && (
                  <div className="flex items-center justify-between px-4 py-2.5 text-sm bg-red-50">
                    <span className="text-red-700 flex items-center gap-1.5"><ShieldAlert size={13} />Unpaid invoices</span>
                    <span className="font-bold text-red-700">{financial.unpaidCount} invoices · {financial.unpaidAmount.toFixed(3)} OMR</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 px-4 py-3">Could not load financial data.</p>
            )}
          </div>

          {/* Risk warning */}
          {hasFinancialRisk && (
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <ShieldAlert size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>Financial risk:</strong> This org has unresolved financial items. Purging will permanently erase them from the system. Make sure all obligations are settled before proceeding.
              </p>
            </div>
          )}

          {/* Export before purge */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-blue-800">Save a copy before purging</p>
              <p className="text-xs text-blue-600 mt-0.5">Downloads a full Excel record — invoices, payments, expenses, maintenance.</p>
            </div>
            <button
              onClick={handleExport}
              disabled={exportingExcel || loadingFinancial}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {exportingExcel ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              Export Excel
            </button>
          </div>

          {/* Confirm input */}
          <div>
            <label className="label text-red-700">Type the organization name to confirm</label>
            <input
              className="input border-red-300 focus:ring-red-400"
              placeholder={orgName}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={handleClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handlePurge}
              disabled={loading || confirm !== orgName || loadingFinancial}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Purge Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
