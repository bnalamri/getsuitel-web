'use client'
import { Download } from 'lucide-react'
import { buildXlsxBlob } from '@/lib/xlsx-zip'

interface Row {
  unit: { unit_number: string; properties: { name: string } | null }
  vacantSince: Date | null; daysVacant: number | null
  monthlyRent: number; lostRent: number; currency: string
}
interface Props { rows: Row[]; currency: string; totalLost: number }

function fmt(n: number, currency: string) {
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${currency}`
}

export default function VacancyExcelButton({ rows, currency, totalLost }: Props) {
  const handleExport = () => {
    const blob = buildXlsxBlob({
      'Vacant Units': {
        cols: [
          { label: 'Unit', width: 12 }, { label: 'Property', width: 22 },
          { label: 'Vacant Since', width: 14 }, { label: 'Days Vacant', width: 12 },
          { label: 'Last Rent/mo', width: 16 }, { label: 'Est. Lost Revenue', width: 20 },
        ],
        rows: [
          ...rows.map(r => [
            r.unit.unit_number,
            r.unit.properties?.name ?? '—',
            r.vacantSince ? r.vacantSince.toLocaleDateString('en-GB') : '—',
            r.daysVacant ?? '—',
            r.monthlyRent > 0 ? fmt(r.monthlyRent, r.currency) : '—',
            r.lostRent > 0 ? fmt(r.lostRent, r.currency) : '—',
          ]),
          ['', '', '', '', 'TOTAL LOST', fmt(totalLost, currency)],
        ],
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Vacancy_Report_${new Date().toISOString().slice(0,10)}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
      <Download size={14} /> Excel
    </button>
  )
}
