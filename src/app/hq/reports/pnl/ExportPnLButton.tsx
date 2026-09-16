'use client'
import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export type PnLRow = {
  branch: string
  status: string
  currency: string   // branch's own currency — revenue/expenses/net/hqShare are all in this currency
  revenue: number
  expenses: number
  net: number
  hqShare: number
  licenseFee: number  // always OMR
  units: number
  occupancy: number  // 0-100
}

export type PnLCurrencyTotals = {
  currency: string
  revenue: number
  expenses: number
  net: number
  share: number
}

export type PnLSummary = {
  byCurrency: PnLCurrencyTotals[]  // never blended across currencies
  totLicense: number               // always OMR
  totUnits: number
  totOccupied: number
}

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

function colLetter(n: number): string {
  let s = ''
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) }
  return s
}
function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6">
  <font><sz val="11"/><name val="Calibri"/></font>
  <font><b/><sz val="16"/><color rgb="FF1B3A6B"/><name val="Calibri"/></font>
  <font><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font>
  <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  <font><b/><sz val="10"/><color rgb="FF1B3A6B"/><name val="Calibri"/></font>
  <font><sz val="10"/><name val="Calibri"/></font>
</fonts>
<fills count="7">
  <fill><patternFill patternType="none"/></fill>
  <fill><patternFill patternType="gray125"/></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FF1B3A6B"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFFFF8ED"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFdcfce7"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFfee2e2"/></patternFill></fill>
</fills>
<borders count="2">
  <border><left/><right/><top/><bottom/><diagonal/></border>
  <border>
    <left style="thin"><color rgb="FFe2e8f0"/></left>
    <right style="thin"><color rgb="FFe2e8f0"/></right>
    <top style="thin"><color rgb="FFe2e8f0"/></top>
    <bottom style="thin"><color rgb="FFe2e8f0"/></bottom>
    <diagonal/>
  </border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="14">
  <xf numFmtId="0"  fontId="0" fillId="0" borderId="0" xfId="0"/>                                                                          <!-- 0: default -->
  <xf numFmtId="0"  fontId="1" fillId="0" borderId="0" xfId="0"/>                                                                          <!-- 1: title -->
  <xf numFmtId="0"  fontId="2" fillId="0" borderId="0" xfId="0"/>                                                                          <!-- 2: subtitle grey -->
  <xf numFmtId="0"  fontId="3" fillId="2" borderId="1" xfId="0"><alignment horizontal="left" vertical="center"/></xf>                      <!-- 3: header navy left -->
  <xf numFmtId="0"  fontId="3" fillId="2" borderId="1" xfId="0"><alignment horizontal="right" vertical="center"/></xf>                     <!-- 4: header navy right -->
  <xf numFmtId="0"  fontId="5" fillId="3" borderId="1" xfId="0"><alignment vertical="center"/></xf>                                        <!-- 5: data row even left -->
  <xf numFmtId="2"  fontId="5" fillId="3" borderId="1" xfId="0"><alignment horizontal="right" vertical="center"/></xf>                     <!-- 6: data row even right num -->
  <xf numFmtId="0"  fontId="5" fillId="0" borderId="1" xfId="0"><alignment vertical="center"/></xf>                                        <!-- 7: data row odd left -->
  <xf numFmtId="2"  fontId="5" fillId="0" borderId="1" xfId="0"><alignment horizontal="right" vertical="center"/></xf>                     <!-- 8: data row odd right num -->
  <xf numFmtId="0"  fontId="4" fillId="4" borderId="1" xfId="0"><alignment horizontal="left" vertical="center"/></xf>                      <!-- 9: totals left -->
  <xf numFmtId="2"  fontId="4" fillId="4" borderId="1" xfId="0"><alignment horizontal="right" vertical="center"/></xf>                     <!-- 10: totals right num -->
  <xf numFmtId="0"  fontId="5" fillId="5" borderId="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf>                    <!-- 11: positive (green bg) -->
  <xf numFmtId="0"  fontId="5" fillId="6" borderId="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf>                    <!-- 12: negative (red bg) -->
  <xf numFmtId="0"  fontId="5" fillId="3" borderId="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf>                    <!-- 13: center even -->
</cellXfs>
</styleSheet>`

async function exportExcel(rows: PnLRow[], summary: PnLSummary, dateStr: string) {
  const JSZip = await loadJSZip()
  const zip = new JSZip()
  const strings: string[] = []

  function si(v: string): number {
    const i = strings.indexOf(v)
    if (i !== -1) return i
    strings.push(v)
    return strings.length - 1
  }

  const xmlRows: string[] = []
  let r = 1

  function sCell(col: number, val: string, s: number) {
    return `<c r="${colLetter(col)}${r}" s="${s}" t="s"><v>${si(val)}</v></c>`
  }
  function nCell(col: number, val: number, s: number) {
    return `<c r="${colLetter(col)}${r}" s="${s}" t="n"><v>${val}</v></c>`
  }
  function eCell(col: number, s: number) {
    return `<c r="${colLetter(col)}${r}" s="${s}"/>`
  }

  const fmt3 = (n: number) => n.toFixed(3)
  const ALL_COLS = [2,3,4,5,6,7,8,9,10]

  // ── Title ──────────────────────────────────────────────────────────────────
  xmlRows.push(`<row r="${r}" ht="24" customHeight="1">${sCell(1, 'GetSuitel HQ — Cross-Branch P&L Summary', 1)}${ALL_COLS.map(c => eCell(c, 0)).join('')}</row>`); r++
  xmlRows.push(`<row r="${r}">${sCell(1, `Generated: ${dateStr}`, 2)}${ALL_COLS.map(c => eCell(c, 0)).join('')}</row>`); r++
  r++ // blank row

  // ── Platform Summary — one block per currency, never blended ──────────────
  xmlRows.push(`<row r="${r}">${sCell(1, 'PLATFORM SUMMARY (by currency)', 1)}${ALL_COLS.map(c => eCell(c, 0)).join('')}</row>`); r++

  const summaryItems: [string, string][] = []
  for (const c of summary.byCurrency) {
    summaryItems.push([`Total Revenue (${c.currency})`, fmt3(c.revenue)])
    summaryItems.push([`Total Expenses (${c.currency})`, fmt3(c.expenses)])
    summaryItems.push([`Net Income (${c.currency})`, fmt3(c.net)])
    summaryItems.push([`HQ Share (${c.currency})`, fmt3(c.share)])
  }
  summaryItems.push(['License Fees (OMR)', fmt3(summary.totLicense)])
  const totOccPct = summary.totUnits > 0 ? `${Math.round((summary.totOccupied / summary.totUnits) * 100)}%` : '0%'
  summaryItems.push(['Platform Occupancy', totOccPct])
  summaryItems.push([`Units: ${summary.totOccupied} of ${summary.totUnits} occupied`, ''])

  for (const [label, val] of summaryItems) {
    xmlRows.push(`<row r="${r}">${sCell(1, label, 7)}${sCell(2, val, 8)}${[3,4,5,6,7,8,9,10].map(c => eCell(c, 0)).join('')}</row>`); r++
  }
  r++ // blank

  // ── Column headers ─────────────────────────────────────────────────────────
  const headers = ['Branch', 'Status', 'Currency', 'Revenue', 'Expenses', 'Net Income', 'HQ Share', 'License Fee (OMR)', 'Units', 'Occupancy %']
  xmlRows.push(`<row r="${r}" ht="18" customHeight="1">${headers.map((h, i) => sCell(i + 1, h, i === 0 ? 3 : 4)).join('')}</row>`); r++

  // ── Data rows — Revenue/Expenses/Net/HQ Share are in the branch's own currency ──
  rows.forEach((row, idx) => {
    const even = idx % 2 === 0
    const lS = even ? 5 : 7    // left string cell style
    const nS = even ? 6 : 8    // right number cell style
    const cS = even ? 13 : 7   // center cell
    const netS = row.net >= 0 ? 11 : 12
    xmlRows.push(
      `<row r="${r}" ht="15" customHeight="1">` +
      sCell(1, row.branch, lS) +
      sCell(2, row.status, lS) +
      sCell(3, row.currency, lS) +
      nCell(4, row.revenue, nS) +
      nCell(5, row.expenses, nS) +
      sCell(6, fmt3(row.net), netS) +
      nCell(7, row.hqShare, nS) +
      nCell(8, row.licenseFee, nS) +
      nCell(9, row.units, nS) +
      sCell(10, `${row.occupancy}%`, cS) +
      `</row>`
    )
    r++
  })

  // ── Totals row — Revenue/Expenses/Net/Share are per currency (see summary above);
  // only License Fee (always OMR) and Occupancy are safe to sum across branches. ──
  const totOccRow = summary.totUnits > 0 ? Math.round((summary.totOccupied / summary.totUnits) * 100) : 0
  xmlRows.push(
    `<row r="${r}" ht="18" customHeight="1">` +
    sCell(1, 'Platform Total', 9) +
    eCell(2, 9) +
    sCell(3, 'see summary', 9) +
    eCell(4, 9) + eCell(5, 9) + eCell(6, 9) + eCell(7, 9) +
    nCell(8, summary.totLicense, 10) +
    nCell(9, summary.totUnits, 10) +
    sCell(10, `${totOccRow}%`, 9) +
    `</row>`
  )

  // ── Column widths ──────────────────────────────────────────────────────────
  const colsXml = `<cols>
    <col min="1" max="1" width="32" customWidth="1"/>
    <col min="2" max="2" width="12" customWidth="1"/>
    <col min="3" max="3" width="10" customWidth="1"/>
    <col min="4" max="7" width="16" customWidth="1"/>
    <col min="8" max="8" width="16" customWidth="1"/>
    <col min="9" max="9" width="8"  customWidth="1"/>
    <col min="10" max="10" width="12" customWidth="1"/>
  </cols>`

  // ── Merge cells: title spans all cols ─────────────────────────────────────
  const mergesXml = `<mergeCells count="2">
    <mergeCell ref="A1:J1"/>
    <mergeCell ref="A2:J2"/>
  </mergeCells>`

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${colsXml}
<sheetData>${xmlRows.join('\n')}</sheetData>
${mergesXml}
</worksheet>`

  const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${strings.map(s => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('\n')}
</sst>`

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`)
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="HQ P&amp;L" sheetId="1" r:id="rId1"/></sheets></workbook>`)
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)
  zip.file('xl/worksheets/sheet1.xml', sheetXml)
  zip.file('xl/sharedStrings.xml', ssXml)
  zip.file('xl/styles.xml', STYLES_XML)

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `HQ_PnL_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
}

export default function ExportPnLButton({ rows, summary }: { rows: PnLRow[]; summary: PnLSummary }) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      await exportExcel(rows, summary, dateStr)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      Export Excel
    </button>
  )
}
