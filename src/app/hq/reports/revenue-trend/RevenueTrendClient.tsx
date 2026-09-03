'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────────────────────────
type BillingRow = {
  branch_id: string
  branch_name: string
  month: string
  revenue: number
  share: number
  license: number
  status: string
}
type Branch = { id: string; display_name: string }

// ── Colors ────────────────────────────────────────────────────────────────────
const COLORS = ['#F59E0B','#3B82F6','#10B981','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316']

// ── Donut chart ───────────────────────────────────────────────────────────────
function polarXY(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
function arcPath(cx: number, cy: number, ro: number, ri: number, a1: number, a2: number) {
  const s1 = polarXY(cx, cy, ro, a1), e1 = polarXY(cx, cy, ro, a2)
  const s2 = polarXY(cx, cy, ri, a2), e2 = polarXY(cx, cy, ri, a1)
  const lg = a2 - a1 > 180 ? 1 : 0
  return `M${s1.x.toFixed(2)},${s1.y.toFixed(2)} A${ro},${ro},0,${lg},1,${e1.x.toFixed(2)},${e1.y.toFixed(2)} L${s2.x.toFixed(2)},${s2.y.toFixed(2)} A${ri},${ri},0,${lg},0,${e2.x.toFixed(2)},${e2.y.toFixed(2)} Z`
}

function DonutChart({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  if (total === 0) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No revenue data</div>
  )
  let angle = 0
  const paths = slices.filter(s => s.value > 0).map((s, i) => {
    const sweep = (s.value / total) * 360
    const path = sweep >= 359.9
      ? arcPath(100, 100, 80, 50, 0, 359.9)
      : arcPath(100, 100, 80, 50, angle, angle + sweep)
    angle += sweep
    return { ...s, path, i }
  })
  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 200 200" className="w-52 h-52">
        {paths.map(p => <path key={p.i} d={p.path} fill={p.color} />)}
        <text x="100" y="96" textAnchor="middle" style={{ fontSize: 11, fill: '#6b7280' }}>Total</text>
        <text x="100" y="114" textAnchor="middle" style={{ fontSize: 15, fontWeight: 700, fill: '#111827' }}>
          {total.toFixed(0)}
        </text>
        <text x="100" y="128" textAnchor="middle" style={{ fontSize: 9, fill: '#9ca3af' }}>OMR</text>
      </svg>
      <div className="w-full max-w-sm flex flex-col gap-2">
        {paths.map(p => (
          <div key={p.i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="truncate text-gray-700 flex-1">{p.label}</span>
            <span className="font-semibold text-gray-900">{p.value.toFixed(3)}</span>
            <span className="text-gray-400 text-xs w-12 text-right">{((p.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Excel export ──────────────────────────────────────────────────────────────
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
function escXml(v: string | number | null | undefined): string {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
function colLetter(n: number): string {
  let s = ''; while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) } return s
}
const XLSX_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B3A6B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
  <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
  <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
  <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
</cellXfs>
</styleSheet>`

type CellDef = { v: string | number | null; s: number }
function buildXlsxSheet(rows: CellDef[][], widths: number[], strIdx: Record<string, number>): string {
  const cols = widths.map((w, i) => `<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')
  const lastCol = colLetter(Math.max(...rows.map(r => r.length), 1))
  const rowXml = rows.map((row, ri) => {
    const cells = row.map((c, ci) => {
      const ref = `${colLetter(ci+1)}${ri+1}`
      if (!c.v && c.v !== 0) return `<c r="${ref}" s="${c.s}"/>`
      if (typeof c.v === 'number') return `<c r="${ref}" s="${c.s}"><v>${c.v}</v></c>`
      return `<c r="${ref}" t="s" s="${c.s}"><v>${strIdx[String(c.v)] ?? 0}</v></c>`
    }).join('')
    return `<row r="${ri+1}">${cells}</row>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${lastCol}${rows.length}"/>
<sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${rowXml}</sheetData>
</worksheet>`
}

async function exportToExcel(billing: BillingRow[], months: string[], monthLabel: (m: string) => string) {
  const JSZip = await loadJSZip()

  // Sheet 1: Monthly Platform Totals
  const monthTotals: Record<string, { revenue: number; share: number; license: number }> = {}
  months.forEach(m => { monthTotals[m] = { revenue: 0, share: 0, license: 0 } })
  billing.forEach(r => {
    if (monthTotals[r.month]) {
      monthTotals[r.month].revenue += r.revenue
      monthTotals[r.month].share   += r.share
      monthTotals[r.month].license += r.license
    }
  })
  const sheet1Hdr: CellDef[] = ['Month','Total Revenue (OMR)','HQ Share (OMR)','License Fee (OMR)'].map(h => ({ v: h, s: 1 }))
  const sheet1Rows: CellDef[][] = [sheet1Hdr, ...months.slice().reverse().map((m, i) => {
    const t = monthTotals[m]; const alt = i % 2 === 1 ? 3 : 2
    return [{ v: monthLabel(m), s: alt }, { v: t.revenue, s: alt }, { v: t.share, s: alt }, { v: t.license, s: alt }]
  })]

  // Sheet 2: Per-Branch Breakdown
  const sheet2Hdr: CellDef[] = ['Branch','Month','Revenue (OMR)','HQ Share (OMR)','License Fee (OMR)','License Status'].map(h => ({ v: h, s: 1 }))
  const sheet2Rows: CellDef[][] = [sheet2Hdr, ...billing.map((r, i) => {
    const alt = i % 2 === 1 ? 3 : 2
    return [
      { v: r.branch_name, s: alt }, { v: monthLabel(r.month), s: alt },
      { v: r.revenue, s: alt }, { v: r.share, s: alt }, { v: r.license, s: alt },
      { v: r.status, s: r.status === 'paid' ? 4 : alt },
    ]
  })]

  const sheetDefs = [
    { name: 'Monthly Totals', rows: sheet1Rows, widths: [16, 20, 18, 18] },
    { name: 'Per-Branch Breakdown', rows: sheet2Rows, widths: [30, 14, 20, 18, 18, 12] },
  ]

  // Build shared strings
  const allStrings: string[] = []
  const allStrIdx: Record<string, number> = {}
  const addStr = (v: string) => { if (allStrIdx[v] === undefined) { allStrIdx[v] = allStrings.length; allStrings.push(v) } }
  sheetDefs.forEach(s => s.rows.forEach(row => row.forEach(c => { if (typeof c.v === 'string' && c.v) addStr(c.v) })))

  const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${allStrings.length}" uniqueCount="${allStrings.length}">
${allStrings.map(s => `<si><t xml:space="preserve">${escXml(s)}</t></si>`).join('')}
</sst>`

  const zip = new JSZip()
  zip.file('xl/styles.xml', XLSX_STYLES)
  zip.file('xl/sharedStrings.xml', ssXml)
  sheetDefs.forEach((s, i) => zip.file(`xl/worksheets/sheet${i+1}.xml`, buildXlsxSheet(s.rows, s.widths, allStrIdx)))
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetDefs.map((s,i) => `<sheet name="${escXml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets>
</workbook>`)
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetDefs.map((_,i) => `<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('\n  ')}
  <Relationship Id="rId${sheetDefs.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId${sheetDefs.length+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`)
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`)
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheetDefs.map((_,i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n  ')}
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`)

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `hq-revenue-trend-${new Date().toISOString().slice(0,10)}.xlsx`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ── Main client component ──────────────────────────────────────────────────────
function monthLabel(m: string) {
  return new Date(m).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

export default function RevenueTrendClient({
  billing, branches, months, selectedBranch,
}: {
  billing: BillingRow[]
  branches: Branch[]
  months: string[]
  selectedBranch: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [exporting, setExporting] = useState(false)

  function handleBranchChange(val: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (val) params.set('branch', val)
    else params.delete('branch')
    const qs = params.toString()
    router.push(qs ? `/hq/reports/revenue-trend?${qs}` : '/hq/reports/revenue-trend')
  }

  // Monthly totals from filtered billing
  const monthTotals: Record<string, number> = {}
  months.forEach(m => { monthTotals[m] = 0 })
  billing.forEach(r => { if (monthTotals[r.month] !== undefined) monthTotals[r.month] += r.revenue })
  const maxRevenue = Math.max(...Object.values(monthTotals), 1)

  // Per-branch totals for donut (always use all billing, not filtered, for context)
  // But if a branch is selected, show only that branch vs others
  const branchTotals: Record<string, { name: string; revenue: number }> = {}
  billing.forEach(r => {
    if (!branchTotals[r.branch_id]) branchTotals[r.branch_id] = { name: r.branch_name, revenue: 0 }
    branchTotals[r.branch_id].revenue += r.revenue
  })
  const donutSlices = Object.entries(branchTotals).map(([id, b], i) => ({
    label: b.name,
    value: b.revenue,
    color: COLORS[i % COLORS.length],
  }))

  async function handleExport() {
    setExporting(true)
    try { await exportToExcel(billing, months, monthLabel) } catch (e) { console.error(e) }
    setExporting(false)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Trend</h1>
          <p className="text-sm text-gray-500">Monthly revenue per branch — last 12 months</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Branch filter */}
          <select
            value={selectedBranch ?? ''}
            onChange={e => handleBranchChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.display_name}</option>)}
          </select>
          {/* Excel export */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50"
          >
            {exporting ? '⏳' : '⬇'} Export Excel
          </button>
        </div>
      </div>

      {/* Donut chart — revenue by branch */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Revenue Distribution by Branch</h2>
        <DonutChart slices={donutSlices} />
      </div>

      {/* Bar chart — monthly totals */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-800">Platform Monthly Revenue</h2>
          <span className="text-xs text-gray-400">
            {selectedBranch ? branches.find(b => b.id === selectedBranch)?.display_name : 'All branches'} · OMR
          </span>
        </div>
        <div className="space-y-3">
          {months.slice().reverse().map(m => {
            const rev = monthTotals[m] ?? 0
            const pct = maxRevenue > 0 ? (rev / maxRevenue) * 100 : 0
            return (
              <div key={m} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0 text-right">{monthLabel(m)}</span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%`, minWidth: pct > 0 ? 4 : 0 }} />
                </div>
                <span className="text-xs font-medium text-gray-700 w-24 flex-shrink-0 text-right">
                  {rev.toFixed(3)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-branch table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Per-Branch Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Branch</th>
                <th className="px-5 py-3 text-left">Month</th>
                <th className="px-5 py-3 text-right">Revenue (OMR)</th>
                <th className="px-5 py-3 text-right">HQ Share (OMR)</th>
                <th className="px-5 py-3 text-right">License Fee (OMR)</th>
                <th className="px-5 py-3 text-left">License Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!billing.length ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No billing records in last 12 months</td></tr>
              ) : billing.map(r => (
                <tr key={`${r.branch_id}-${r.month}`} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{r.branch_name}</td>
                  <td className="px-5 py-3 text-gray-600">{monthLabel(r.month)}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{r.revenue.toFixed(3)}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{r.share.toFixed(3)}</td>
                  <td className="px-5 py-3 text-right text-purple-700 font-medium">{r.license.toFixed(3)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
