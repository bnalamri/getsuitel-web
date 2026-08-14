'use client'
import { useState, useMemo } from 'react'
import { AlertTriangle, Download, Printer, Loader2 } from 'lucide-react'
import PrintHeader from '@/components/PrintHeader'

type Invoice = {
  id: string; amount: number | string; currency: string; status: string
  due_date: string; created_at: string; type: string; notes?: string | null
  tenants?: { full_name: string; email: string; phone?: string | null } | null
  units?: { unit_number: string; properties?: { id: string; name: string } | null } | null
}
type Property = { id: string; name: string }

function fmtAmt(n: number, currency: string) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}
function fmtDate(d: string, fmt = 'DD/MM/YYYY') {
  if (!d) return '—'
  const dt = new Date(d)
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const yyyy = String(dt.getFullYear())
  if (fmt === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`
  if (fmt === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`
  return `${dd}/${mm}/${yyyy}`
}
function daysOverdue(dueDate: string) {
  const due  = new Date(dueDate)
  const now  = new Date()
  due.setHours(0,0,0,0); now.setHours(0,0,0,0)
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000))
}

// ── Simple Excel export (pure client, no JSZip needed for CSV-like output) ───
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
function esc(v: string | number | null | undefined): string {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
function colLetter(n: number): string {
  let s = ''; while (n > 0) { n--; s = String.fromCharCode(65+(n%26))+s; n=Math.floor(n/26) }; return s
}

async function exportToExcel({ orgName, rows, dateFormat }: {
  orgName: string
  dateFormat: string
  rows: Array<{ tenant: string; email: string; unit: string; property: string; amount: number; currency: string; dueDate: string; days: number; status: string }>
}) {
  const JSZip = await loadJSZip()
  const zip   = new JSZip()
  const strings: string[] = []
  function si(v: string): number { const i=strings.indexOf(v); if(i!==-1) return i; strings.push(v); return strings.length-1 }

  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B3A6B"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEF2F2"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0"><alignment horizontal="left"/></xf>
  <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2" fontId="0" fillId="3" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2" fontId="3" fillId="0" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
</cellXfs>
</styleSheet>`

  const sheetRows: string[] = []
  let r = 1
  sheetRows.push(`<row r="${r}"><c r="A${r}" s="1" t="s"><v>${si(orgName+' — Arrears & Overdue Report')}</v></c></row>`); r++
  sheetRows.push(`<row r="${r}"><c r="A${r}" s="0" t="s"><v>${si('Generated: '+new Date().toLocaleDateString())}</v></c></row>`); r++
  r++
  const hdrs = ['Tenant','Email','Unit','Property','Amount','Currency','Due Date','Days Overdue','Status']
  sheetRows.push(`<row r="${r}">${hdrs.map((h,i) => `<c r="${colLetter(i+1)}${r}" s="${i<4?2:3}" t="s"><v>${si(h)}</v></c>`).join('')}</row>`); r++

  const totals: Record<string,number> = {}
  rows.forEach(row => {
    totals[row.currency] = (totals[row.currency]??0) + row.amount
    sheetRows.push(`<row r="${r}">
      <c r="A${r}" s="0" t="s"><v>${si(row.tenant)}</v></c>
      <c r="B${r}" s="0" t="s"><v>${si(row.email)}</v></c>
      <c r="C${r}" s="0" t="s"><v>${si(row.unit)}</v></c>
      <c r="D${r}" s="0" t="s"><v>${si(row.property)}</v></c>
      <c r="E${r}" s="4" t="n"><v>${row.amount}</v></c>
      <c r="F${r}" s="0" t="s"><v>${si(row.currency)}</v></c>
      <c r="G${r}" s="0" t="s"><v>${si(row.dueDate)}</v></c>
      <c r="H${r}" s="0" t="n"><v>${row.days}</v></c>
      <c r="I${r}" s="0" t="s"><v>${si(row.status)}</v></c>
    </row>`); r++
  })
  r++
  for (const [cur, total] of Object.entries(totals)) {
    sheetRows.push(`<row r="${r}"><c r="D${r}" s="0" t="s"><v>${si('TOTAL ' + cur)}</v></c><c r="E${r}" s="5" t="n"><v>${total}</v></c><c r="F${r}" s="0" t="s"><v>${si(cur)}</v></c></row>`); r++
  }

  const sst = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${strings.map(s=>`<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows.join('')}</sheetData></worksheet>`
  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Arrears" sheetId="1" r:id="rId1"/></sheets></workbook>`

  zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`)
  zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
  zip.file('xl/workbook.xml', wb)
  zip.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)
  zip.file('xl/worksheets/sheet1.xml', sheet)
  zip.file('xl/sharedStrings.xml', sst)
  zip.file('xl/styles.xml', STYLES)

  const blob = await zip.generateAsync({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `Arrears_Overdue_Report.xlsx`; a.click()
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ArrearsClient({
  invoices, properties, defaultCurrency, dateFormat, orgName, userName,
}: {
  invoices: Invoice[]; properties: Property[]
  defaultCurrency: string; dateFormat: string
  orgName: string; userName: string
}) {
  const [filterProperty, setFilterProperty] = useState('')
  const [filterCurrency, setFilterCurrency] = useState('')
  const [exporting, setExporting] = useState(false)

  const filtered = useMemo(() => invoices.filter(inv => {
    if (filterProperty) {
      const pid = (inv.units as any)?.properties?.id
      if (pid !== filterProperty) return false
    }
    if (filterCurrency && inv.currency !== filterCurrency) return false
    return true
  }), [invoices, filterProperty, filterCurrency])

  const currencies = useMemo(() => [...new Set(invoices.map(i => i.currency))], [invoices])

  const totals = useMemo(() => filtered.reduce<Record<string,number>>((acc,inv) => {
    acc[inv.currency] = (acc[inv.currency]??0) + Number(inv.amount)
    return acc
  }, {}), [filtered])

  const uniqueTenants = new Set(filtered.map(inv => (inv.tenants as any)?.email).filter(Boolean)).size

  async function handleExport() {
    setExporting(true)
    await exportToExcel({
      orgName,
      dateFormat,
      rows: filtered.map(inv => ({
        tenant:   (inv.tenants as any)?.full_name ?? '—',
        email:    (inv.tenants as any)?.email ?? '',
        unit:     (inv.units as any)?.unit_number ?? '—',
        property: (inv.units as any)?.properties?.name ?? '—',
        amount:   Number(inv.amount),
        currency: inv.currency,
        dueDate:  fmtDate(inv.due_date, dateFormat),
        days:     daysOverdue(inv.due_date),
        status:   inv.status,
      })),
    })
    setExporting(false)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Print Header */}
      <PrintHeader
        reportTitle="Arrears & Overdue Report"
        orgName={orgName}
        userName={userName}
      />

      {/* Page title */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-xl">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Arrears & Overdue</h1>
            <p className="text-sm text-slate-500">All unpaid invoices past their due date</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {exporting ? <Loader2 size={15} className="animate-spin"/> : <Download size={15}/>}
            Excel
          </button>
          <button
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Printer size={15}/> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        {properties.length > 0 && (
          <select className="input w-48 text-sm" value={filterProperty} onChange={e => setFilterProperty(e.target.value)}>
            <option value="">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        {currencies.length > 1 && (
          <select className="input w-32 text-sm" value={filterCurrency} onChange={e => setFilterCurrency(e.target.value)}>
            <option value="">All Currencies</option>
            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(totals).map(([cur, total]) => (
          <div key={cur} className="card p-4">
            <p className="text-xs text-slate-500 mb-1">Total at Risk</p>
            <p className="text-xl font-bold text-red-600">{fmtAmt(total, cur)}</p>
          </div>
        ))}
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Invoices</p>
          <p className="text-xl font-bold text-slate-900">{filtered.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Tenants Affected</p>
          <p className="text-xl font-bold text-slate-900">{uniqueTenants}</p>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <AlertTriangle size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No overdue invoices</p>
          <p className="text-slate-400 text-sm mt-1">All invoices are up to date.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Tenant</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Unit</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Property</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Amount</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Due Date</th>
                <th className="text-right px-4 py-3 text-slate-600 font-semibold">Days Overdue</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(inv => {
                const tenant = inv.tenants as any
                const unit   = inv.units as any
                const days   = daysOverdue(inv.due_date)
                return (
                  <tr key={inv.id} className="hover:bg-red-50/40">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{tenant?.full_name ?? '—'}</div>
                      <div className="text-xs text-slate-400">{tenant?.email ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{unit?.unit_number ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{unit?.properties?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-700">
                      {fmtAmt(Number(inv.amount), inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {fmtDate(inv.due_date, dateFormat)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        days > 30 ? 'bg-red-100 text-red-700' :
                        days > 7  ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {days}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
