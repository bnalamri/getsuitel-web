'use client'
import { Download } from 'lucide-react'
import { buildXlsxBlob } from '@/lib/xlsx-zip'

interface TechRow {
  name: string; total: number; completed: number; open: number;
  totalRevenue: number; completionRate: number; avgResolutionHours: number | null;
}
interface Props {
  techRows: TechRow[]; currency: string
  totalJobs: number; totalRevenue: number; totalCompleted: number
}

function fmt(n: number, currency: string) {
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${currency}`
}

export default function TechExcelButton({ techRows, currency, totalJobs, totalRevenue, totalCompleted }: Props) {
  const handleExport = () => {
    const blob = buildXlsxBlob({
      'Performance': {
        cols: [
          { label: 'Technician', width: 24 }, { label: 'Total Jobs', width: 12 },
          { label: 'Completed', width: 12 }, { label: 'Open', width: 10 },
          { label: 'Completion %', width: 14 }, { label: 'Avg Resolution', width: 16 },
          { label: 'Revenue Billed', width: 18 },
        ],
        rows: [
          ...techRows.map(t => [
            t.name, t.total, t.completed, t.open,
            `${t.completionRate}%`,
            t.avgResolutionHours != null ? (t.avgResolutionHours >= 24 ? `${Math.round(t.avgResolutionHours / 24)}d` : `${t.avgResolutionHours}h`) : '—',
            t.totalRevenue > 0 ? fmt(t.totalRevenue, currency) : '—',
          ]),
          ['TOTAL', totalJobs, totalCompleted, totalJobs - totalCompleted, '', '', fmt(totalRevenue, currency)],
        ],
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Tech_Performance_${new Date().toISOString().slice(0,10)}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
      <Download size={14} /> Excel
    </button>
  )
}
