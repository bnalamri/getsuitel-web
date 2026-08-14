// Shared raw-XLSX builder (no npm library)
// Usage: buildXlsxBlob({ 'Sheet1': { cols: [...], rows: [[...], ...] }, ... })

export type XlsxCol = { label: string; width?: number }
export type XlsxCell = string | number | null | undefined

function esc(v: XlsxCell): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3">
  <font><sz val="11"/><name val="Calibri"/></font>
  <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  <font><b/><sz val="11"/><color rgb="FF1B3A6B"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
  <fill><patternFill patternType="none"/></fill>
  <fill><patternFill patternType="gray125"/></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FF1B3A6B"/></patternFill></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0"><alignment horizontal="left"/></xf>
  <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0"/>
</cellXfs>
</styleSheet>`

function buildSheet(cols: XlsxCol[], rows: XlsxCell[][]): string {
  const colDefs = cols.map((c, i) =>
    `<col min="${i+1}" max="${i+1}" width="${c.width ?? 14}" customWidth="1"/>`
  ).join('')

  function cell(v: XlsxCell, col: number, row: number, style = 0): string {
    const ref = String.fromCharCode(65 + col) + row
    if (typeof v === 'number')
      return `<c r="${ref}" t="n" s="${style}"><v>${v}</v></c>`
    return `<c r="${ref}" t="inlineStr" s="${style}"><is><t>${esc(v)}</t></is></c>`
  }

  // Header row (style 1 = dark blue bg, white bold)
  const headerRow = `<row r="1">${cols.map((c, ci) => cell(c.label, ci, 1, 1)).join('')}</row>`
  const dataRows = rows.map((row, ri) => {
    const r = ri + 2
    const style = ri % 2 === 1 ? 3 : 0
    return `<row r="${r}">${row.map((v, ci) => cell(v, ci, r, style)).join('')}</row>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${colDefs}</cols><sheetData>${headerRow}${dataRows}</sheetData></worksheet>`
}

export function buildXlsxBlob(sheets: Record<string, { cols: XlsxCol[]; rows: XlsxCell[][] }>): Blob {
  const enc = new TextEncoder()
  const sheetNames = Object.keys(sheets)
  const sheetXmls = sheetNames.map(name => buildSheet(sheets[name].cols, sheets[name].rows))

  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetNames.map((n,i) => `<sheet name="${esc(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetNames.map((_,i) => `<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheetNames.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`

  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetNames.map((_,i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': enc.encode(ct),
    '_rels/.rels': enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': enc.encode(wb),
    'xl/_rels/workbook.xml.rels': enc.encode(wbRels),
    'xl/styles.xml': enc.encode(STYLES),
    ...Object.fromEntries(sheetNames.map((_, i) => [`xl/worksheets/sheet${i+1}.xml`, enc.encode(sheetXmls[i])]))
  }

  return new Blob([buildZip(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

function buildZip(files: Record<string, Uint8Array>): Uint8Array {
  const enc = new TextEncoder()
  const crc32 = (buf: Uint8Array) => {
    let crc = 0xFFFFFFFF
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c }
    for (const b of buf) crc = t[(crc ^ b) & 0xFF] ^ (crc >>> 8)
    return (crc ^ 0xFFFFFFFF) >>> 0
  }
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
