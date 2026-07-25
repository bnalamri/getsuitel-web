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
<fills count="5">
  <fill><patternFill patternType="none"/></fill>
  <fill><patternFill patternType="gray125"/></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FF15803D"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFB91C1C"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="9">
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0"><alignment horizontal="left"/></xf>
  <xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0"><alignment horizontal="left"/></xf>
  <xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2" fontId="0" fillId="4" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2" fontId="4" fillId="0" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
</cellXfs>
</styleSheet>`

export async function exportPnLToExcel({ orgName, from, to, currency, rentIncome, serviceChargesIncome, totalIncome, expenseByCategory, ownerMaintCost, totalExpenses, netIncome, margin }: {
  orgName: string; from: string; to: string; currency: string
  rentIncome: number; serviceChargesIncome: number; totalIncome: number
  expenseByCategory: { label: string; total: number }[]
  ownerMaintCost: number; recordedExpenses: number; totalExpenses: number
  netIncome: number; margin: number
}) {
  const JSZip = await loadJSZip()
  const zip = new JSZip()
  const strings: string[] = []
  function si(v: string): number { const i = strings.indexOf(v); if (i !== -1) return i; strings.push(v); return strings.length - 1 }
  const fmt3 = (n: number) => n.toFixed(3)

  const rows: string[] = []
  let r = 1

  function strCell(col: number, val: string, s: number) { return `<c r="${colLetter(col)}${r}" s="${s}" t="s"><v>${si(val)}</v></c>` }
  function numCell(col: number, val: number, s: number) { return `<c r="${colLetter(col)}${r}" s="${s}" t="n"><v>${val}</v></c>` }

  // Title
  rows.push(`<row r="${r}">${strCell(1, `${orgName} — Income Statement (P&L)`, 1)}</row>`); r++
  rows.push(`<row r="${r}">${strCell(1, `Period: ${from} to ${to} · ${currency}`, 2)}</row>`); r++
  r++

  // INCOME header
  rows.push(`<row r="${r}">${strCell(1, 'INCOME', 3)}${strCell(2, '', 4)}</row>`); r++
  rows.push(`<row r="${r}">${strCell(1, 'Rent Collected', 0)}${numCell(2, rentIncome, 7)}</row>`); r++
  if (serviceChargesIncome > 0) {
    rows.push(`<row r="${r}">${strCell(1, 'Service Charges (tenant-paid)', 0)}${numCell(2, serviceChargesIncome, 7)}</row>`); r++
  }
  rows.push(`<row r="${r}">${strCell(1, 'Total Income', 3)}${numCell(2, totalIncome, 8)}</row>`); r++
  r++

  // EXPENSES header
  rows.push(`<row r="${r}">${strCell(1, 'EXPENSES', 5)}${strCell(2, '', 6)}</row>`); r++
  expenseByCategory.forEach(({ label, total }) => {
    rows.push(`<row r="${r}">${strCell(1, label, 0)}${numCell(2, total, 7)}</row>`); r++
  })
  if (ownerMaintCost > 0) {
    rows.push(`<row r="${r}">${strCell(1, 'Maintenance Charges (owner-paid)', 0)}${numCell(2, ownerMaintCost, 7)}</row>`); r++
  }
  rows.push(`<row r="${r}">${strCell(1, 'Total Expenses', 5)}${numCell(2, totalExpenses, 8)}</row>`); r++
  r++

  // Net
  const netLabel = netIncome >= 0 ? 'NET PROFIT' : 'NET LOSS'
  rows.push(`<row r="${r}">${strCell(1, netLabel, 3)}${numCell(2, Math.abs(netIncome), 8)}</row>`); r++
  rows.push(`<row r="${r}">${strCell(1, 'Profit Margin', 0)}${strCell(2, `${margin.toFixed(1)}%`, 0)}</row>`)

  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">
${strings.map(s => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('\n')}
</sst>`

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${rows.join('\n')}</sheetData>
</worksheet>`

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`)
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="P&amp;L" sheetId="1" r:id="rId1"/></sheets></workbook>`)
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)
  zip.file('xl/worksheets/sheet1.xml', sheetXml)
  zip.file('xl/sharedStrings.xml', sharedStringsXml)
  zip.file('xl/styles.xml', STYLES_XML)

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `PnL_${from}_to_${to}.xlsx`
  a.click()
}
