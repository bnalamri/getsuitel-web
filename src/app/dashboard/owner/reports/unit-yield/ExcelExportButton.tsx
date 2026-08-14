'use client'
import { Download } from 'lucide-react'
import { buildXlsxBlob } from '@/lib/xlsx-zip'

interface Row {
  unit: { unit_number: string; status: string; properties: { name: string } | null }
  monthlyRent: number; annualRent: number; ytdCollected: number
}
interface Props { rows: Row[]; currency: string; totalAnnual: number; totalYTD: number; year: number }

function fmt(n: number, c: string) { return `${n.toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3})} ${c}` }

export default function UnitYieldExcelButton({ rows, currency, totalAnnual, totalYTD, year }: Props) {
  const handleExport = () => {
    const blob = buildXlsxBlob({
      [`Unit Yield ${year}`]: {
        cols: [
          { label: 'Unit', width: 12 }, { label: 'Property', width: 22 }, { label: 'Status', width: 12 },
          { label: 'Monthly Rent', width: 18 }, { label: 'Annual Rent', width: 18 }, { label: 'YTD Collected', width: 18 },
        ],
        rows: [
          ...rows.map(r => [
            r.unit.unit_number,
            (r.unit.properties as any)?.name ?? '—',
            r.unit.status,
            r.monthlyRent > 0 ? fmt(r.monthlyRent, currency) : '—',
            r.annualRent > 0 ? fmt(r.annualRent, currency) : '—',
            r.ytdCollected > 0 ? fmt(r.ytdCollected, currency) : '—',
          ]),
          ['TOTAL', '', '', '', fmt(totalAnnual, currency), fmt(totalYTD, currency)],
        ],
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Unit_Yield_${year}_${new Date().toISOString().slice(0,10)}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
      <Download size={14} /> Excel
    </button>
  )
}
