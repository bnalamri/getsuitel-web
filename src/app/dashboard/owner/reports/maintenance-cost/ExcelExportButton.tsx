'use client'
import { Download } from 'lucide-react'
import { buildXlsxBlob } from '@/lib/xlsx-zip'

interface PropRow { name: string; total: number; count: number }
interface CatRow  { cat: string;  total: number; count: number }
interface TechRow { tech: string; total: number; count: number }
interface Props {
  propRows: PropRow[]; catRows: CatRow[]; techRows: TechRow[]
  total: number; currency: string
}

function fmt(n: number, c: string) { return `${n.toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3})} ${c}` }

export default function MaintenanceCostExcelButton({ propRows, catRows, techRows, total, currency }: Props) {
  const handleExport = () => {
    const blob = buildXlsxBlob({
      'By Property': {
        cols: [{ label: 'Property', width: 24 }, { label: 'Jobs', width: 10 }, { label: 'Total Charged', width: 20 }],
        rows: [
          ...propRows.map(p => [p.name, p.count, fmt(p.total, currency)]),
          ['TOTAL', propRows.reduce((s,p)=>s+p.count,0), fmt(total, currency)],
        ],
      },
      'By Category': {
        cols: [{ label: 'Category', width: 20 }, { label: 'Jobs', width: 10 }, { label: 'Total', width: 20 }],
        rows: catRows.map(c => [c.cat, c.count, fmt(c.total, currency)]),
      },
      'By Technician': {
        cols: [{ label: 'Technician', width: 24 }, { label: 'Jobs', width: 10 }, { label: 'Total', width: 20 }, { label: 'Avg/Job', width: 18 }],
        rows: techRows.map(t => [t.tech, t.count, fmt(t.total, currency), fmt(t.total / t.count, currency)]),
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Maintenance_Cost_${new Date().toISOString().slice(0,10)}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
      <Download size={14} /> Excel
    </button>
  )
}
