'use client'
import { Download } from 'lucide-react'

export default function ExportCSVButton({
  data, headers, filename,
}: {
  data: Record<string, string | number | null | undefined>[]
  headers: string[]
  filename: string
}) {
  function download() {
    const keys = Object.keys(data[0] ?? {})
    const rows = data.map(r => headers.map((_, i) => `"${String(r[keys[i]] ?? '').replace(/"/g, '""')}"`).join(','))
    const csv  = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  if (!data.length) return null
  return (
    <button
      onClick={download}
      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
    >
      <Download className="w-4 h-4" /> Export CSV
    </button>
  )
}
