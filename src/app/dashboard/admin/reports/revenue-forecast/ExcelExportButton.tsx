'use client'
import { Download } from 'lucide-react'

type MonthRow   = { key: string; label: string; renewals: number; atRisk: number; expectedMRR: number }
type ExpiringOrg = { id: string; name: string; subscription_plan: string; subscription_status: string; subscription_expires_at: string | null }

interface Props {
  mrr: number; arr: number; totalExpected12m: number; expiring30Count: number
  byPlan: Record<string, { count: number; mrr: number }>
  months: MonthRow[]
  expiring30: ExpiringOrg[]
  currency: string
}

function esc(v: string | number | null | undefined) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function buildXlsx(props: Props): Blob {
  const { currency } = props
  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF1B3A6B"/><name val="Calibri"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B3A6B"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0"><alignment horizontal="left"/></xf>
  <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0"/>
</cellXfs>
</styleSheet>`

  const enc = new TextEncoder()

  function r(cells: { v: string|number; s?: number }[], idx: number) {
    const cols = cells.map((c, ci) => {
      const ref = String.fromCharCode(65 + ci) + idx
      const s = c.s ?? 0
      if (typeof c.v === 'number') return `<c r="${ref}" t="n" s="${s}"><v>${c.v}</v></c>`
      return `<c r="${ref}" t="inlineStr" s="${s}"><is><t>${esc(c.v)}</t></is></c>`
    })
    return `<row r="${idx}">${cols.join('')}</row>`
  }

  function fmt(n: number) { return `${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}` }

  const today = new Date().toLocaleDateString('en-GB')

  // Sheet 1: Summary
  const summaryRows = [
    r([{v:'Revenue Forecast', s:2}], 1),
    r([{v:`Generated: ${today} · Currency: ${currency}`}], 2),
    r([], 3),
    r([{v:'Metric',s:1},{v:'Value',s:1}], 4),
    r([{v:'Current MRR'},{v:fmt(props.mrr)}], 5),
    r([{v:'ARR (×12)'},{v:fmt(props.arr)}], 6),
    r([{v:'12-Month Forecast'},{v:fmt(props.totalExpected12m)}], 7),
    r([{v:'Expiring in 30 Days'},{v:props.expiring30Count}], 8),
  ]
  const sheet1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols><col min="1" max="1" width="22" customWidth="1"/><col min="2" max="2" width="18" customWidth="1"/></cols>
<sheetData>${summaryRows.join('')}</sheetData></worksheet>`

  // Sheet 2: MRR by Plan
  const planEntries = Object.entries(props.byPlan)
  const planRows = [
    r([{v:'Plan',s:1},{v:'Orgs',s:1},{v:'MRR/mo',s:1}], 1),
    ...planEntries.map(([plan, data], i) => r([{v:plan.toUpperCase()},{v:data.count},{v:fmt(data.mrr)}], i+2)),
    r([{v:'TOTAL',s:1},{v:planEntries.reduce((s,[,d])=>s+d.count,0),s:1},{v:fmt(props.mrr),s:1}], planEntries.length+2),
  ]
  const sheet2 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols><col min="1" max="1" width="16"/><col min="2" max="3" width="14"/></cols>
<sheetData>${planRows.join('')}</sheetData></worksheet>`

  // Sheet 3: 12-month forecast
  const forecastRows = [
    r([{v:'Month',s:1},{v:'Renewals Due',s:1},{v:'At Risk',s:1},{v:'Expected Revenue',s:1}], 1),
    ...props.months.map((m, i) => r([{v:m.label},{v:m.renewals},{v:m.atRisk},{v:m.expectedMRR > 0 ? fmt(m.expectedMRR) : '—'}], i+2)),
    r([{v:'TOTAL',s:1},{v:'',s:1},{v:'',s:1},{v:fmt(props.totalExpected12m),s:1}], props.months.length+2),
  ]
  const sheet3 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols><col min="1" max="1" width="14"/><col min="2" max="4" width="16"/></cols>
<sheetData>${forecastRows.join('')}</sheetData></worksheet>`

  // Sheet 4: Expiring soon (only if any)
  let sheet4 = ''
  const hasExpiring = props.expiring30.length > 0
  if (hasExpiring) {
    const expiringRows = [
      r([{v:'Organization',s:1},{v:'Plan',s:1},{v:'Status',s:1},{v:'Expires',s:1},{v:'Days Left',s:1},{v:'MRR',s:1}], 1),
      ...props.expiring30.map((o, i) => {
        const exp = o.subscription_expires_at ? new Date(o.subscription_expires_at) : null
        const daysLeft = exp ? Math.ceil((exp.getTime() - Date.now()) / 86400000) : 0
        return r([{v:o.name},{v:o.subscription_plan.toUpperCase()},{v:o.subscription_status},{v:exp?.toLocaleDateString('en-GB')||'—'},{v:daysLeft}], i+2)
      }),
    ]
    sheet4 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols><col min="1" max="1" width="28"/><col min="2" max="6" width="14"/></cols>
<sheetData>${expiringRows.join('')}</sheetData></worksheet>`
  }

  const sheetCount = hasExpiring ? 4 : 3
  const wbSheets = [
    `<sheet name="Summary" sheetId="1" r:id="rId1"/>`,
    `<sheet name="MRR by Plan" sheetId="2" r:id="rId2"/>`,
    `<sheet name="12-Month Forecast" sheetId="3" r:id="rId3"/>`,
    hasExpiring ? `<sheet name="Expiring Soon" sheetId="4" r:id="rId4"/>` : '',
  ].join('')

  const wbRelsEntries = Array.from({length: sheetCount}, (_,i) =>
    `<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`
  ).join('') + `<Relationship Id="rId${sheetCount+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`

  const ctEntries = Array.from({length: sheetCount}, (_,i) =>
    `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join('')

  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${wbSheets}</sheets></workbook>`
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRelsEntries}</Relationships>`
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${ctEntries}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`

  const crc32 = (buf: Uint8Array) => {
    let crc = 0xFFFFFFFF
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c }
    for (const b of buf) crc = t[(crc ^ b) & 0xFF] ^ (crc >>> 8)
    return (crc ^ 0xFFFFFFFF) >>> 0
  }

  function buildZip(files: Record<string, Uint8Array>): Uint8Array {
    const localParts: Uint8Array[] = []
    const centralParts: Uint8Array[] = []
    const offsets: number[] = []
    let offset = 0
    const entries = Object.entries(files)
    for (const [name, data] of entries) {
      const nb = enc.encode(name); const crc = crc32(data)
      const lh = new Uint8Array(30 + nb.length); const lv = new DataView(lh.buffer)
      lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0,true);lv.setUint16(8,0,true);lv.setUint16(10,0,true);lv.setUint16(12,0,true)
      lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,nb.length,true);lv.setUint16(28,0,true)
      lh.set(nb,30); offsets.push(offset); offset+=lh.length+data.length
      localParts.push(new Uint8Array([...lh,...data]))
    }
    for(let i=0;i<entries.length;i++){
      const [name,data]=entries[i]; const nb=enc.encode(name); const crc=crc32(data)
      const cd=new Uint8Array(46+nb.length); const cv=new DataView(cd.buffer)
      cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0,true);cv.setUint16(10,0,true);cv.setUint16(12,0,true);cv.setUint16(14,0,true)
      cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,nb.length,true);cv.setUint16(30,0,true);cv.setUint16(32,0,true)
      cv.setUint16(34,0,true);cv.setUint16(36,0,true);cv.setUint32(38,0,true);cv.setUint32(42,offsets[i],true)
      cd.set(nb,46); centralParts.push(cd)
    }
    const cdSize = centralParts.reduce((s,c)=>s+c.length,0)
    const eocd=new Uint8Array(22); const ev=new DataView(eocd.buffer)
    ev.setUint32(0,0x06054b50,true);ev.setUint16(4,0,true);ev.setUint16(6,0,true)
    ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true)
    ev.setUint32(12,cdSize,true);ev.setUint32(16,offset,true);ev.setUint16(20,0,true)
    return new Uint8Array([...localParts.flatMap(h=>[...h]),...centralParts.flatMap(c=>[...c]),...eocd])
  }

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': enc.encode(contentTypes),
    '_rels/.rels': enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': enc.encode(wb),
    'xl/_rels/workbook.xml.rels': enc.encode(wbRels),
    'xl/styles.xml': enc.encode(STYLES),
    'xl/worksheets/sheet1.xml': enc.encode(sheet1),
    'xl/worksheets/sheet2.xml': enc.encode(sheet2),
    'xl/worksheets/sheet3.xml': enc.encode(sheet3),
  }
  if (hasExpiring) files['xl/worksheets/sheet4.xml'] = enc.encode(sheet4)

  return new Blob([buildZip(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export default function ExcelExportButton(props: Props) {
  const handleExport = () => {
    const blob = buildXlsx(props)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Revenue_Forecast_${new Date().toISOString().slice(0,10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
      <Download size={14} />
      Excel
    </button>
  )
}
