'use client'
import { Download } from 'lucide-react'
import { buildXlsxBlob, type XlsxCell } from '@/lib/xlsx-zip'

// Drop-in replacement for ExportCSVButton — same (data, headers, filename) shape,
// but writes a real, styled .xlsx (navy header row, typed numeric cells, column
// widths) via the shared xlsx-zip builder instead of a bare-bones CSV blob.
// Plain CSV export has two problems flagged during HQ QA: (1) every cell —
// including numbers — gets wrapped in literal quote marks with no header
// styling, so it looks unfinished next to the P&L/Revenue Trend exports; and
// (2) a field containing an embedded newline (e.g. a tenant name with a
// stray line break) can desync the CSV's row structure entirely. A real XLSX
// text cell holds embedded newlines fine, so switching format fixes both.
export default function ExportExcelButton({
  data, headers, filename, colWidths,
}: {
  data: Record<string, string | number | null | undefined>[]
  headers: string[]
  filename: string
  colWidths?: number[]
}) {
  function download() {
    const keys = Object.keys(data[0] ?? {})
    const rows: XlsxCell[][] = data.map(r => headers.map((_, i) => {
      const v = r[keys[i]]
      return typeof v === 'number' ? v : ((v ?? '') as XlsxCell)
    }))
    const blob = buildXlsxBlob({
      Report: {
        cols: headers.map((h, i) => ({ label: h, width: colWidths?.[i] ?? 18 })),
        rows,
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  if (!data.length) return null
  return (
    <button
      onClick={download}
      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
    >
      <Download className="w-4 h-4" /> Export Excel
    </button>
  )
}
