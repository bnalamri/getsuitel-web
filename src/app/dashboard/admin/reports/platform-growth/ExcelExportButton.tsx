'use client'
import { Download } from 'lucide-react'

type MonthRow = { key: string; label: string; new: number; activated: number; churned: number; cumulative: number }

interface Props {
  totalOrgs: number; activeOrgs: number; trialingOrgs: number; churnedOrgs: number
  growthPct: number | null; newThisMonth: number; newLastMonth: number
  months: MonthRow[]
}

function esc(v: string | number | null | undefined) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function buildXlsx(props: Props): Blob {
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

  function r(cells: { v: string|number; s?: number }[], idx: number) {
    const cols = cells.map((c, ci) => {
      const ref = String.fromCharCode(65 + ci) + idx
      const s = c.s ?? 0
      if (typeof c.v === 'number') return `<c r="${ref}" t="n" s="${s}"><v>${c.v}</v></c>`
      return `<c r="${ref}" t="inlineStr" s="${s}"><is><t>${esc(c.v)}</t></is></c>`
    })
    return `<row r="${idx}">${cols.join('')}</row>`
  }

  // Sheet 1: Summary
  const today = new Date().toLocaleDateString('en-GB')
  const summaryRows = [
    r([{v:'Platform Growth Report', s:2}], 1),
    r([{v:`Generated: ${today}`}], 2),
    r([], 3),
    r([{v:'Metric',s:1},{v:'Count',s:1}], 4),
    r([{v:'Total Orgs'},{v:props.totalOrgs}], 5),
    r([{v:'Active'},{v:props.activeOrgs}], 6),
    r([{v:'Trialing'},{v:props.trialingOrgs}], 7),
    r([{v:'Churned'},{v:props.churnedOrgs}], 8),
    ...(props.growthPct != null ? [r([{v:'MoM Growth'},{v:`${props.growthPct >= 0 ? '+' : ''}${props.growthPct}%`}], 9)] : []),
    r([{v:'New This Month'},{v:props.newThisMonth}], props.growthPct != null ? 10 : 9),
    r([{v:'New Last Month'},{v:props.newLastMonth}], props.growthPct != null ? 11 : 10),
  ]
  const sheet1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols><col min="1" max="1" width="20" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/></cols>
<sheetData>${summaryRows.join('')}</sheetData></worksheet>`

  // Sheet 2: Monthly
  const reversed = [...props.months].reverse()
  const monthRows = [
    r([{v:'Month',s:1},{v:'New Orgs',s:1},{v:'Activated',s:1},{v:'Churned',s:1},{v:'Cumulative',s:1}], 1),
    ...reversed.map((m, i) => r([{v:m.label},{v:m.new},{v:m.activated},{v:m.churned},{v:m.cumulative}], i+2, )),
  ]
  const sheet2 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols><col min="1" max="1" width="14"/><col min="2" max="5" width="12"/></cols>
<sheetData>${monthRows.join('')}</sheetData></worksheet>`

  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Summary" sheetId="1" r:id="rId1"/><sheet name="Monthly Data" sheetId="2" r:id="rId2"/></sheets>
</workbook>`

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`

  const enc = new TextEncoder()
  // Minimal ZIP builder
  function zip(files: Record<string, Uint8Array>): Uint8Array {
    const crc32 = (buf: Uint8Array) => {
      let crc = 0xFFFFFFFF
      const t = new Uint32Array(256)
      for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c }
      for (const b of buf) crc = t[(crc ^ b) & 0xFF] ^ (crc >>> 8)
      return (crc ^ 0xFFFFFFFF) >>> 0
    }
    const localHeaders: Uint8Array[] = []
    const offsets: number[] = []
    let offset = 0
    const entries = Object.entries(files)
    for (const [name, data] of entries) {
      const nameBytes = enc.encode(name)
      const crc = crc32(data)
      const lh = new Uint8Array(30 + nameBytes.length)
      const lhv = new DataView(lh.buffer)
      lhv.setUint32(0, 0x04034b50, true); lhv.setUint16(4, 20, true); lhv.setUint16(6, 0, true)
      lhv.setUint16(8, 0, true); lhv.setUint16(10, 0, true); lhv.setUint16(12, 0, true)
      lhv.setUint32(14, crc, true); lhv.setUint32(18, data.length, true); lhv.setUint32(22, data.length, true)
      lhv.setUint16(26, nameBytes.length, true); lhv.setUint16(28, 0, true)
      lh.set(nameBytes, 30)
      offsets.push(offset)
      offset += lh.length + data.length
      localHeaders.push(new Uint8Array([...lh, ...data]))
    }
    const centralDir: Uint8Array[] = []
    let cdSize = 0
    for (let i = 0; i < entries.length; i++) {
      const [name, data] = entries[i]
      const nameBytes = enc.encode(name)
      const crc = crc32(data)
      const cd = new Uint8Array(46 + nameBytes.length)
      const cdv = new DataView(cd.buffer)
      cdv.setUint32(0, 0x02014b50, true); cdv.setUint16(4, 20, true); cdv.setUint16(6, 20, true)
      cdv.setUint16(8, 0, true); cdv.setUint16(10, 0, true); cdv.setUint16(12, 0, true); cdv.setUint16(14, 0, true)
      cdv.setUint32(16, crc, true); cdv.setUint32(20, data.length, true); cdv.setUint32(24, data.length, true)
      cdv.setUint16(28, nameBytes.length, true); cdv.setUint16(30, 0, true); cdv.setUint16(32, 0, true)
      cdv.setUint16(34, 0, true); cdv.setUint16(36, 0, true); cdv.setUint32(38, 0, true)
      cdv.setUint32(42, offsets[i], true)
      cd.set(nameBytes, 46)
      centralDir.push(cd)
      cdSize += cd.length
    }
    const eocd = new Uint8Array(22)
    const eocdv = new DataView(eocd.buffer)
    eocdv.setUint32(0, 0x06054b50, true); eocdv.setUint16(4, 0, true); eocdv.setUint16(6, 0, true)
    eocdv.setUint16(8, entries.length, true); eocdv.setUint16(10, entries.length, true)
    eocdv.setUint32(12, cdSize, true); eocdv.setUint32(16, offset, true); eocdv.setUint16(20, 0, true)
    return new Uint8Array([...localHeaders.flatMap(h => [...h]), ...centralDir.flatMap(c => [...c]), ...eocd])
  }

  const bytes = zip({
    '[Content_Types].xml': enc.encode(contentTypes),
    '_rels/.rels': enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': enc.encode(wb),
    'xl/_rels/workbook.xml.rels': enc.encode(wbRels),
    'xl/styles.xml': enc.encode(STYLES),
    'xl/worksheets/sheet1.xml': enc.encode(sheet1),
    'xl/worksheets/sheet2.xml': enc.encode(sheet2),
  })
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export default function ExcelExportButton(props: Props) {
  const handleExport = () => {
    const blob = buildXlsx(props)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Platform_Growth_${new Date().toISOString().slice(0,10)}.xlsx`
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
