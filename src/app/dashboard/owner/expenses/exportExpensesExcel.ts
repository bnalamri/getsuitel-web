// Excel export for Expenses Report
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

export type ExpenseRow = {
  date: string; category: string; description: string
  propertyName: string; amount: number; currency: string; notes?: string | null
}

export async function exportExpensesToExcel({ orgName, filterLabel, rows }: {
  orgName: string; filterLabel: string; rows: ExpenseRow[]
}) {
  const JSZip = await loadJSZip()
  const zip   = new JSZip()

  const strings: string[] = []
  function si(v: string): number {
    const i = strings.indexOf(v); if (i !== -1) return i
    strings.push(v); return strings.length - 1
  }

  const sheetRows: string[] = []
  let r = 1

  // Title
  sheetRows.push(`<row r="${r}"><c r="A${r}" s="1" t="s"><v>${si(`${orgName} — Expenses Report`)}</v></c></row>`); r++
  sheetRows.push(`<row r="${r}"><c r="A${r}" s="2" t="s"><v>${si(filterLabel)}</v></c></row>`); r++
  r++ // blank

  // Header
  const hdrs = ['Date','Category','Description','Property','Amount','Currency','Notes']
  sheetRows.push(`<row r="${r}">${hdrs.map((h,i) => `<c r="${colLetter(i+1)}${r}" s="${i===0?3:4}" t="s"><v>${si(h)}</v></c>`).join('')}</row>`); r++

  // Totals per currency
  const totals: Record<string, number> = {}

  rows.forEach((row, idx) => {
    const alt = idx % 2 === 1
    totals[row.currency] = (totals[row.currency] ?? 0) + row.amount
    sheetRows.push(`<row r="${r}">
      <c r="A${r}" s="0" t="s"><v>${si(row.date)}</v></c>
      <c r="B${r}" s="0" t="s"><v>${si(row.category)}</v></c>
      <c r="C${r}" s="0" t="s"><v>${si(row.description)}</v></c>
      <c r="D${r}" s="0" t="s"><v>${si(row.propertyName || '—')}</v></c>
      <c r="E${r}" s="${alt?6:5}" t="n"><v>${row.amount}</v></c>
      <c r="F${r}" s="0" t="s"><v>${si(row.currency)}</v></c>
      <c r="G${r}" s="0" t="s"><v>${si(row.notes ?? '')}</v></c>
    </row>`); r++
  })

  // Totals
  r++
  for (const [cur, total] of Object.entries(totals)) {
    sheetRows.push(`<row r="${r}">
      <c r="D${r}" s="0" t="s"><v>${si('TOTAL ' + cur)}</v></c>
      <c r="E${r}" s="8" t="n"><v>${total}</v></c>
      <c r="F${r}" s="0" t="s"><v>${si(cur)}</v></c>
    </row>`); r++
  }

  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${strings.map(s => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('\n')}
</sst>`

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${sheetRows.join('\n')}</sheetData>
</worksheet>`

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Expenses" sheetId="1" r:id="rId1"/></sheets>
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
  a.download = `Expenses_Report.xlsx`
  a.click()
}
