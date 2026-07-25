// Excel export for Monthly Income Report
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

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="5">
  <font><sz val="11"/><name val="Calibri"/></font>
  <font><b/><sz val="14"/><name val="Calibri"/></font>
  <font><b/><sz val="11"/><color rgb="FF1B3A6B"/><name val="Calibri"/></font>
  <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  <font><b/><sz val="11"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
  <fill><patternFill patternType="none"/></fill>
  <fill><patternFill patternType="gray125"/></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FF1B3A6B"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
</fills>
<borders count="2">
  <border><left/><right/><top/><bottom/><diagonal/></border>
  <border><bottom ss:lineStyle="thin"><color rgb="FFE2E8F0"/></bottom></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="9">
  <xf numFmtId="0"  fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0"  fontId="1" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0"  fontId="2" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0"  fontId="3" fillId="2" borderId="0" xfId="0"><alignment horizontal="left"/></xf>
  <xf numFmtId="0"  fontId="3" fillId="2" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2"  fontId="0" fillId="0" borderId="1" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2"  fontId="0" fillId="3" borderId="1" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2"  fontId="4" fillId="3" borderId="1" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2"  fontId="4" fillId="0" borderId="1" xfId="0"><alignment horizontal="right"/></xf>
</cellXfs>
</styleSheet>`

interface MonthRow { month: number; label: string; issued: number; collected: number; pending: number; overdue: number; collectionRate: number }
interface PropRow  { propertyName: string; issued: number; collected: number; pending: number; overdue: number }

export async function exportIncomeToExcel({ orgName, year, month, currency, monthRows, propRows, yearTotal, yearRate }: {
  orgName: string; year: string; month?: string; currency: string
  monthRows: MonthRow[]; propRows: PropRow[]
  yearTotal: { issued: number; collected: number; pending: number; overdue: number }
  yearRate: number
}) {
  const JSZip = await loadJSZip()
  const zip = new JSZip()

  const fmt3 = (n: number) => n.toFixed(3)
  const pct  = (n: number) => `${n.toFixed(1)}%`

  const rows: string[] = []
  let r = 1

  const cell = (col: number, row: number, val: string | number, s: number, t = 'str') => {
    const ref = `${colLetter(col)}${row}`
    if (t === 'n') return `<c r="${ref}" s="${s}" t="n"><v>${val}</v></c>`
    return `<c r="${ref}" s="${s}" t="s"><v>${val}</v></c>`
  }

  // shared strings
  const strings: string[] = []
  function si(v: string): number { const i = strings.indexOf(v); if (i !== -1) return i; strings.push(v); return strings.length - 1 }

  // Title row
  rows.push(`<row r="${r}"><c r="A${r}" s="1" t="s"><v>${si(`${orgName} — Monthly Income Report`)}</v></c></row>`); r++
  rows.push(`<row r="${r}"><c r="A${r}" s="2" t="s"><v>${si(month ? `${month} ${year} · ${currency}` : `Year ${year} · ${currency}`)}</v></c></row>`); r++
  r++ // blank

  const hdrs = month
    ? ['Property', 'Invoiced', 'Collected', 'Pending', 'Overdue', 'Rate']
    : ['Month', 'Invoiced', 'Collected', 'Pending', 'Overdue', 'Rate']

  rows.push(`<row r="${r}">${hdrs.map((h, i) => `<c r="${colLetter(i+1)}${r}" s="${i===0?3:4}" t="s"><v>${si(h)}</v></c>`).join('')}</row>`); r++

  const data = month ? propRows : monthRows
  data.forEach((row, idx) => {
    const alt = idx % 2 === 1
    const name = month ? (row as PropRow).propertyName : (row as MonthRow).label
    const rate = (row.issued > 0 ? (row.collected / row.issued) * 100 : 0)
    rows.push(`<row r="${r}">
      <c r="A${r}" s="0" t="s"><v>${si(name)}</v></c>
      <c r="B${r}" s="${alt?6:5}" t="n"><v>${row.issued}</v></c>
      <c r="C${r}" s="${alt?6:5}" t="n"><v>${row.collected}</v></c>
      <c r="D${r}" s="${alt?6:5}" t="n"><v>${row.pending}</v></c>
      <c r="E${r}" s="${alt?6:5}" t="n"><v>${row.overdue}</v></c>
      <c r="F${r}" s="0" t="s"><v>${si(pct(rate))}</v></c>
    </row>`); r++
  })

  // Total row
  rows.push(`<row r="${r}">
    <c r="A${r}" s="0" t="s"><v>${si('TOTAL')}</v></c>
    <c r="B${r}" s="8" t="n"><v>${yearTotal.issued}</v></c>
    <c r="C${r}" s="8" t="n"><v>${yearTotal.collected}</v></c>
    <c r="D${r}" s="8" t="n"><v>${yearTotal.pending}</v></c>
    <c r="E${r}" s="8" t="n"><v>${yearTotal.overdue}</v></c>
    <c r="F${r}" s="0" t="s"><v>${si(pct(yearRate))}</v></c>
  </row>`)

  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${strings.map(s => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('\n')}
</sst>`

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${rows.join('\n')}</sheetData>
</worksheet>`

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Income Report" sheetId="1" r:id="rId1"/></sheets>
</workbook>`

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`)
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
  zip.file('xl/workbook.xml', workbookXml)
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)
  zip.file('xl/worksheets/sheet1.xml', sheetXml)
  zip.file('xl/sharedStrings.xml', sharedStringsXml)
  zip.file('xl/styles.xml', STYLES_XML)

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `Income_Report_${year}${month ? '_' + month.slice(0,3) : ''}.xlsx`
  a.click()
}
