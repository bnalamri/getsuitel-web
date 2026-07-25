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
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B3A6B"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2" fontId="0" fillId="3" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
  <xf numFmtId="2" fontId="3" fillId="0" borderId="0" xfId="0"><alignment horizontal="right"/></xf>
</cellXfs>
</styleSheet>`

type PropRevGroup = { name: string; paid: number; overdue: number; pending: number }
type PropPerf     = { name: string; total: number; occupied: number; vacant: number; occupancy: number; rentPotential: number; actualRent: number; collected: number }
type OverdueInv   = { tenant: string; unit: string; property: string; amount: number; dueDate: string }

export default function ReportsExcelButton({ propRevGroups, propPerf, overdueInv, currency }: {
  propRevGroups: PropRevGroup[]; propPerf: PropPerf[]; overdueInv: OverdueInv[]; currency: string
}) {
  async function handleExport() {
    const JSZip = await loadJSZip()
    const zip = new JSZip()
    const strings: string[] = []
    function si(v: string) { const i = strings.indexOf(v); if (i !== -1) return i; strings.push(v); return strings.length - 1 }

    const rows: string[] = []
    let r = 1

    function addRow(cells: string[]) { rows.push(`<row r="${r}">${cells.join('')}</row>`); r++ }
    function blank() { rows.push(`<row r="${r}"/>`); r++ }
    function strCell(col: number, val: string, s: number) { return `<c r="${colLetter(col)}${r}" s="${s}" t="s"><v>${si(val)}</v></c>` }
    function numCell(col: number, val: number, s: number) { return `<c r="${colLetter(col)}${r}" s="${s}" t="n"><v>${val}</v></c>` }

    // Title
    addRow([strCell(1, `Analytics Report — ${new Date().toLocaleDateString('en-GB')}`, 1)])
    blank()

    // Section 1: Revenue by Property (this month)
    addRow([strCell(1, `Revenue by Property (This Month) — ${currency}`, 2), strCell(2,'',2), strCell(3,'',2), strCell(4,'',2)])
    addRow([strCell(1,'Property',2), strCell(2,'Collected',3), strCell(3,'Pending',3), strCell(4,'Overdue',3)])
    propRevGroups.forEach((g, i) => {
      const alt = i%2===1
      addRow([strCell(1, g.name, 0), numCell(2, g.paid, alt?4:5), numCell(3, g.pending, alt?4:5), numCell(4, g.overdue, alt?4:5)])
    })
    const totPaid    = propRevGroups.reduce((s,g)=>s+g.paid, 0)
    const totPending = propRevGroups.reduce((s,g)=>s+g.pending, 0)
    const totOverdue = propRevGroups.reduce((s,g)=>s+g.overdue, 0)
    addRow([strCell(1,'TOTAL',0), numCell(2,totPaid,6), numCell(3,totPending,6), numCell(4,totOverdue,6)])
    blank()

    // Section 2: Property Performance
    addRow([strCell(1,'Property Performance',2),strCell(2,'',2),strCell(3,'',2),strCell(4,'',2),strCell(5,'',2),strCell(6,'',2),strCell(7,'',2)])
    addRow([strCell(1,'Property',2),strCell(2,'Units',3),strCell(3,'Occupied',3),strCell(4,'Vacant',3),strCell(5,'Occupancy',3),strCell(6,'Rent Potential/mo',3),strCell(7,'Collected All-time',3)])
    propPerf.forEach((p, i) => {
      const alt = i%2===1
      addRow([
        strCell(1, p.name, 0),
        numCell(2, p.total, alt?4:5), numCell(3, p.occupied, alt?4:5), numCell(4, p.vacant, alt?4:5),
        strCell(5, `${p.occupancy}%`, 0),
        numCell(6, p.rentPotential, alt?4:5), numCell(7, p.collected, alt?4:5),
      ])
    })
    blank()

    // Section 3: Overdue Rent
    addRow([strCell(1,'Overdue Rent',2),strCell(2,'',2),strCell(3,'',2),strCell(4,'',2)])
    addRow([strCell(1,'Tenant',2),strCell(2,'Unit',3),strCell(3,'Property',3),strCell(4,'Amount',3),strCell(5,'Due Date',3)])
    overdueInv.forEach((o,i) => {
      const alt = i%2===1
      addRow([strCell(1,o.tenant,0),strCell(2,o.unit,0),strCell(3,o.property,0),numCell(4,o.amount,alt?4:5),strCell(5,o.dueDate,0)])
    })

    const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">${strings.map(s=>`<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`
    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join('')}</sheetData></worksheet>`

    zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`)
    zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)
    zip.file('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Reports" sheetId="1" r:id="rId1"/></sheets></workbook>`)
    zip.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)
    zip.file('xl/worksheets/sheet1.xml', sheetXml)
    zip.file('xl/sharedStrings.xml', sharedStringsXml)
    zip.file('xl/styles.xml', STYLES)

    const blob = await zip.generateAsync({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `Analytics_Report_${new Date().toISOString().slice(0,10)}.xlsx`
    a.click()
  }

  return (
    <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm no-print">
      <Download size={15} /> Excel
    </button>
  )
}
