'use client'
import { Download } from 'lucide-react'

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
function colLetter(n: number) { let s = ''; while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) } return s }
function esc(v: string | number | null | undefined) { return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="13"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF15803D"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8">
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2" fontId="0" fillId="3" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2" fontId="3" fillId="0" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="0" fontId="2" fillId="4" borderId="0" xfId="0"/>
</cellXfs>
</styleSheet>`

type Row = {
  tenant: string; unit: string; property: string
  rentAmount: number; currency: string
  paymentMethod: string; paidVia?: string
  status: string
  paidDate?: string; dueDate?: string
  daysOverdue?: number; chequeNumber?: string
}

const STATUS_LABELS: Record<string, string> = {
  paid: 'Paid', cleared: 'Paid (Cheque)', overdue: 'Overdue', bounced: 'Bounced',
  sent: 'Invoice Sent', pending: 'Pending', registered: 'Cheque Registered',
  deposited: 'Deposited', no_invoice: 'No Invoice', cheque: 'Cheque Pending',
}
const isPaid    = (s: string) => s === 'paid' || s === 'cleared'
const isOverdue = (s: string) => s === 'overdue' || s === 'bounced'

export default function MonthlyExcelButton({ rows, monthLabel, orgCurrency, orgName }: {
  rows: Row[]; monthLabel: string; orgCurrency: string; orgName: string
}) {
  async function handleExport() {
    const JSZip = await loadJSZip()
    const zip = new JSZip()
    const strings: string[] = []
    function si(v: string) { const i = strings.indexOf(v); if (i !== -1) return i; strings.push(v); return strings.length - 1 }

    const xmlRows: string[] = []
    let r = 1
    function addRow(cells: string[]) { xmlRows.push(`<row r="${r}">${cells.join('')}</row>`); r++ }
    function blank() { xmlRows.push(`<row r="${r}"/>`); r++ }
    function strCell(col: number, val: string, s: number) { return `<c r="${colLetter(col)}${r}" s="${s}" t="s"><v>${si(val)}</v></c>` }
    function numCell(col: number, val: number, s: number) { return `<c r="${colLetter(col)}${r}" s="${s}" t="n"><v>${val}</v></c>` }

    // Title
    addRow([strCell(1, `${orgName} — Monthly Rent Statement`, 1)])
    addRow([strCell(1, `${monthLabel} · ${orgCurrency}`, 0)])
    blank()

    // Group by property
    const byProp = new Map<string, { name: string; rows: Row[] }>()
    rows.forEach(row => {
      if (!byProp.has(row.property)) byProp.set(row.property, { name: row.property, rows: [] })
      byProp.get(row.property)!.rows.push(row)
    })

    for (const [, group] of byProp) {
      // Property header
      addRow([
        strCell(1, group.name, 2),
        strCell(2, '', 2), strCell(3, '', 2), strCell(4, '', 2),
        strCell(5, '', 2), strCell(6, '', 2), strCell(7, '', 2),
      ])
      // Column headers
      addRow([
        strCell(1, 'Tenant', 3), strCell(2, 'Unit', 3), strCell(3, 'Method', 3),
        strCell(4, 'Rent', 3), strCell(5, 'Due Date', 3), strCell(6, 'Status', 3), strCell(7, 'Details', 3),
      ])

      let propTotal = 0
      group.rows.forEach((row, i) => {
        const alt = i % 2 === 1
        const method = row.paidVia && row.paidVia !== row.paymentMethod
          ? `${row.paidVia} (was ${row.paymentMethod})`
          : row.paymentMethod
        const details = isPaid(row.status) && row.paidDate
          ? `Paid ${row.paidDate}`
          : isOverdue(row.status) && (row.daysOverdue ?? 0) > 0
          ? `${row.daysOverdue}d overdue`
          : row.chequeNumber
          ? `#${row.chequeNumber}`
          : ''
        propTotal += row.rentAmount
        addRow([
          strCell(1, row.tenant, 0),
          strCell(2, row.unit, 0),
          strCell(3, method, 0),
          numCell(4, row.rentAmount, alt ? 4 : 5),
          strCell(5, row.dueDate ?? '', 0),
          strCell(6, STATUS_LABELS[row.status] ?? row.status, 0),
          strCell(7, details, 0),
        ])
      })

      // Property total
      addRow([
        strCell(1, 'Property Total', 0), strCell(2, '', 0), strCell(3, '', 0),
        numCell(4, propTotal, 6),
        strCell(5, '', 0), strCell(6, '', 0), strCell(7, '', 0),
      ])
      blank()
    }

    // Grand total
    const grandTotal = rows.reduce((s, r) => s + r.rentAmount, 0)
    const totalPaid  = rows.filter(r => isPaid(r.status)).reduce((s, r) => s + r.rentAmount, 0)
    const totalOvd   = rows.filter(r => isOverdue(r.status)).reduce((s, r) => s + r.rentAmount, 0)

    addRow([strCell(1, 'GRAND TOTAL', 7), strCell(2, '', 7), strCell(3, '', 7), numCell(4, grandTotal, 6), strCell(5,'',7), strCell(6,'',7), strCell(7,'',7)])
    blank()
    addRow([strCell(1, 'Collected', 0), numCell(2, totalPaid, 5)])
    addRow([strCell(1, 'Overdue', 0), numCell(2, totalOvd, 5)])

    const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${strings.map(s=>`<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`
    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows.join('')}</sheetData></worksheet>`

    zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`)
    zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
    zip.file('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Monthly Statement" sheetId="1" r:id="rId1"/></sheets></workbook>`)
    zip.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)
    zip.file('xl/worksheets/sheet1.xml', sheetXml)
    zip.file('xl/sharedStrings.xml', sharedStringsXml)
    zip.file('xl/styles.xml', STYLES)

    const blob = await zip.generateAsync({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `Monthly_Statement_${monthLabel.replace(' ', '_')}.xlsx`
    a.click()
  }

  return (
    <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm no-print">
      <Download size={15} /> Excel
    </button>
  )
}
