// Client-side styled XLSX generator for Financial Report
// Uses JSZip from CDN — no npm package needed

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

function esc(v: string | number | null | undefined): string {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ─── Style index constants ────────────────────────────────────────────────────
// 0=normal 1=title 2=section 3=hdr-left 4=hdr-right
// 5=data-left 6=data-right 7=alt-left 8=alt-right
// 9=green-right 10=orange-right 11=green-alt 12=orange-alt
// 13=bold-right 14=bold-left
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="7">
  <font><sz val="11"/><name val="Calibri"/></font>
  <font><b/><sz val="14"/><name val="Calibri"/></font>
  <font><b/><sz val="11"/><color rgb="FF1B3A6B"/><name val="Calibri"/></font>
  <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  <font><sz val="11"/><color rgb="FF15803D"/><name val="Calibri"/></font>
  <font><sz val="11"/><color rgb="FFC2410C"/><name val="Calibri"/></font>
  <font><b/><sz val="11"/><name val="Calibri"/></font>
</fonts>
<fills count="6">
  <fill><patternFill patternType="none"/></fill>
  <fill><patternFill patternType="gray125"/></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FF1B3A6B"/><bgColor indexed="64"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFDBEAFE"/><bgColor indexed="64"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="3">
  <border><left/><right/><top/><bottom/><diagonal/></border>
  <border>
    <left style="thin"><color rgb="FFCBD5E1"/></left>
    <right style="thin"><color rgb="FFCBD5E1"/></right>
    <top style="thin"><color rgb="FFCBD5E1"/></top>
    <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
    <diagonal/>
  </border>
  <border><left/><right/><top/><bottom style="medium"><color rgb="FF1B3A6B"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="15">
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  <xf numFmtId="0" fontId="2" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
  <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
  <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
  <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
  <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
  <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
  <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
  <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
  <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
  <xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
  <xf numFmtId="0" fontId="5" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
  <xf numFmtId="0" fontId="6" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
  <xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
</styleSheet>`

// ─── Sheet builder ────────────────────────────────────────────────────────────
type CellDef = { v: string | number | null; s: number; t?: 'n' | 's' }
type RowDef  = CellDef[]

function buildSheet(rows: RowDef[], colWidths: number[]): string {
  const strings: string[] = []
  const strIdx: Record<string, number> = {}
  const addStr = (v: string) => {
    if (strIdx[v] === undefined) { strIdx[v] = strings.length; strings.push(v) }
    return strIdx[v]
  }

  // Pre-collect all strings
  rows.forEach(row => row.forEach(cell => {
    if (cell.v !== null && cell.v !== undefined && typeof cell.v === 'string') addStr(cell.v)
  }))

  const rowXml = rows.map((row, ri) => {
    const rowNum = ri + 1
    const cells = row.map((cell, ci) => {
      const ref = `${colLetter(ci + 1)}${rowNum}`
      if (cell.v === null || cell.v === undefined || cell.v === '') {
        return `<c r="${ref}" s="${cell.s}"/>`
      }
      if (typeof cell.v === 'number') {
        return `<c r="${ref}" s="${cell.s}"><v>${cell.v}</v></c>`
      }
      const idx = addStr(String(cell.v))
      return `<c r="${ref}" t="s" s="${cell.s}"><v>${idx}</v></c>`
    }).join('')
    return `<row r="${rowNum}">${cells}</row>`
  }).join('')

  const lastCol = colLetter(Math.max(...rows.map(r => r.length), 1))
  const lastRow = rows.length
  const colsXml = colWidths.map((w, i) =>
    `<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`
  ).join('')

  const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${strings.map(s => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}
</sst>`

  const wsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${colsXml}</cols>
<dimension ref="A1:${lastCol}${lastRow}"/>
<sheetData>${rowXml}</sheetData>
</worksheet>`

  return wsXml + '|||' + ssXml
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const L = (v: string | number | null, s: number): CellDef => ({ v, s })
const alt = (isAlt: boolean, baseStyle: number) => isAlt ? baseStyle + 2 : baseStyle // shifts white→alt

// ─── Main export function ─────────────────────────────────────────────────────
export async function exportFinancialReportToExcel(data: {
  printDate: string
  byCurrency: { currency: string; invoiced: number; collected: number; outstanding: number; rate: number; count: number }[]
  byOrg: { name: string; subscription_plan: string; subscription_status: string; currency: string; invoiced: number; collected: number; outstanding: number; rate: number; count: number }[]
  byMonth: { label: string; invoiced: number; collected: number; count: number }[]
  planBreakdown: { plan: string; price: number; total: number; active: number; mrr: number }[]
  mrr: number; arr: number
  subRevByCurrency: Record<string, number>
  subPendingByCurrency: Record<string, number>
  orgs: { subscription_status: string }[]
}) {
  const JSZip = await loadJSZip()
  const { printDate, byCurrency, byOrg, byMonth, planBreakdown, mrr, arr, subRevByCurrency, subPendingByCurrency, orgs } = data

  // ── Sheet 1: Summary ────────────────────────────────────────────────────────
  const sum: RowDef[] = [
    [L('GetSuitel — Financial Report', 1), L('', 0), L('', 0), L('', 0), L('', 0), L('', 0)],
    [L('Generated', 14), L(printDate, 5), L('', 0), L('', 0), L('', 0), L('', 0)],
    [L('', 0), L('', 0), L('', 0), L('', 0), L('', 0), L('', 0)],
    [L('RENTAL REVENUE SUMMARY', 2), L('', 2), L('', 2), L('', 2), L('', 2), L('', 2)],
    [L('Currency',3), L('Invoiced',3), L('Collected',3), L('Outstanding',3), L('Collection Rate',3), L('Invoices',4)],
    ...byCurrency.map((c, i) => {
      const a = i % 2 === 1
      return [L(c.currency, a?7:5), L(c.invoiced, a?8:6), L(c.collected, a?11:9), L(c.outstanding, a?12:10), L(`${c.rate}%`, a?8:6), L(c.count, a?8:6)]
    }),
    [L('', 0), L('', 0), L('', 0), L('', 0), L('', 0), L('', 0)],
    [L('SUBSCRIPTION REVENUE SUMMARY', 2), L('', 2), L('', 2), L('', 2), L('', 2), L('', 2)],
    [L('MRR (USD)', 14), L(mrr, 13)],
    [L('ARR (USD)', 14), L(arr, 13)],
    ...Object.entries(subRevByCurrency).map(([c, v]) => [L(`Payments Received (${c})`, 14), L(v, 9)]),
    ...Object.entries(subPendingByCurrency).map(([c, v]) => [L(`Pending Payments (${c})`, 14), L(v, 10)]),
    [L('', 0)],
    [L('SUBSCRIPTION STATUS', 2), L('', 2)],
    [L('Status', 3), L('Count', 4)],
    ...(['active','trialing','past_due','canceled'] as const).map((s, i) => {
      const a = i % 2 === 1
      return [L(s.replace('_',' '), a?7:5), L(orgs.filter(o => o.subscription_status === s).length, a?8:6)]
    }),
  ]

  // ── Sheet 2: By Organization ────────────────────────────────────────────────
  const org: RowDef[] = [
    [L('Organization',3), L('Plan',3), L('Status',3), L('Currency',3), L('Invoiced',4), L('Collected',4), L('Outstanding',4), L('Collection Rate',4), L('Invoices',4)],
    ...byOrg.map((o, i) => {
      const a = i % 2 === 1
      return [
        L(o.name, a?7:5), L(o.subscription_plan, a?7:5), L(o.subscription_status.replace('_',' '), a?7:5), L(o.currency, a?7:5),
        L(o.invoiced, a?8:6), L(o.collected, a?11:9), L(o.outstanding, a?12:10),
        L(`${o.rate}%`, a?8:6), L(o.count, a?8:6),
      ]
    }),
  ]

  // ── Sheet 3: Monthly Trend ──────────────────────────────────────────────────
  const month: RowDef[] = [
    [L('Month',3), L('Invoiced',4), L('Collected',4), L('Invoices',4)],
    ...byMonth.map((m, i) => {
      const a = i % 2 === 1
      return [L(m.label, a?7:5), L(m.invoiced, a?8:6), L(m.collected, a?11:9), L(m.count, a?8:6)]
    }),
  ]

  // ── Sheet 4: Subscription Plans ─────────────────────────────────────────────
  const plans: RowDef[] = [
    [L('Plan',3), L('Price/mo (USD)',4), L('Total Orgs',4), L('Active Orgs',4), L('MRR (USD)',4)],
    ...planBreakdown.map((p, i) => {
      const a = i % 2 === 1
      return [L(p.plan, a?7:5), L(p.price, a?8:6), L(p.total, a?8:6), L(p.active, a?8:6), L(p.mrr, a?11:9)]
    }),
    [L('TOTAL', 14), L('', 0), L('', 0), L('Active', 14), L(mrr, 13)],
  ]

  // ── Build sheets ─────────────────────────────────────────────────────────────
  const sheetDefs = [
    { name: 'Summary',            rows: sum,   widths: [32, 18, 18, 18, 18, 12] },
    { name: 'By Organization',    rows: org,   widths: [30, 14, 14, 12, 16, 16, 16, 16, 12] },
    { name: 'Monthly Trend',      rows: month, widths: [16, 16, 16, 12] },
    { name: 'Subscription Plans', rows: plans, widths: [16, 18, 14, 14, 16] },
  ]

  // Build all worksheet XMLs (each returns "wsXml|||ssXml" — we only use wsXml, shared strings built separately)
  const wsXmls = sheetDefs.map(s => buildSheet(s.rows, s.widths).split('|||')[0])

  // Build combined shared strings across all sheets
  const allStrings: string[] = []
  const allStrIdx: Record<string, number> = {}
  const addGlobal = (v: string) => {
    if (allStrIdx[v] === undefined) { allStrIdx[v] = allStrings.length; allStrings.push(v) }
    return allStrIdx[v]
  }
  sheetDefs.forEach(s => s.rows.forEach(row => row.forEach(cell => {
    if (typeof cell.v === 'string' && cell.v !== '') addGlobal(cell.v)
  })))

  // Re-build worksheets with global string indices
  const finalWsXmls = sheetDefs.map((s) => {
    const rows = s.rows
    const rowXml = rows.map((row, ri) => {
      const rowNum = ri + 1
      const cells = row.map((cell, ci) => {
        const ref = `${colLetter(ci + 1)}${rowNum}`
        if (cell.v === null || cell.v === undefined || cell.v === '') return `<c r="${ref}" s="${cell.s}"/>`
        if (typeof cell.v === 'number') return `<c r="${ref}" s="${cell.s}"><v>${cell.v}</v></c>`
        const idx = allStrIdx[String(cell.v)] ?? 0
        return `<c r="${ref}" t="s" s="${cell.s}"><v>${idx}</v></c>`
      }).join('')
      return `<row r="${rowNum}">${cells}</row>`
    }).join('')

    const lastCol = colLetter(Math.max(...rows.map(r => r.length), 1))
    const lastRow = rows.length
    const colsXml = s.widths.map((w, i) => `<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="16"/>
<cols>${colsXml}</cols>
<dimension ref="A1:${lastCol}${lastRow}"/>
<sheetData>${rowXml}</sheetData>
</worksheet>`
  })

  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${allStrings.length}" uniqueCount="${allStrings.length}">
${allStrings.map(s => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}
</sst>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheetDefs.map((_,i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n  ')}
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetDefs.map((_,i) => `<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('\n  ')}
  <Relationship Id="rId${sheetDefs.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId${sheetDefs.length+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheetDefs.map((s,i) => `<sheet name="${esc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('\n    ')}
  </sheets>
</workbook>`

  // ── Zip it all up ─────────────────────────────────────────────────────────────
  const zip = new JSZip()
  zip.file('[Content_Types].xml', contentTypes)
  zip.file('_rels/.rels', rels)
  zip.file('xl/workbook.xml', workbook)
  zip.file('xl/_rels/workbook.xml.rels', wbRels)
  zip.file('xl/styles.xml', STYLES_XML)
  zip.file('xl/sharedStrings.xml', sharedStringsXml)
  finalWsXmls.forEach((xml, i) => zip.file(`xl/worksheets/sheet${i+1}.xml`, xml))

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
  })

  const today = new Date().toISOString().split('T')[0]
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `GetSuitel_Financial_Report_${today}.xlsx`
  a.click()
  URL.revokeObjectURL(a.href)
}
