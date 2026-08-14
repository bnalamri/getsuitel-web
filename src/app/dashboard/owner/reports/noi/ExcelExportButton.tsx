'use client'
import { Download } from 'lucide-react'
import { buildXlsxBlob } from '@/lib/xlsx-zip'

interface PropRow { name: string; income: number; expCost: number; maintCost: number; totalExpenses: number; noi: number }
interface Props { propData: PropRow[]; currency: string; totalIncome: number; totalExpenses: number; totalNOI: number; noiMargin: string; year: number }

function fmt(n: number, c: string) { return `${n.toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3})} ${c}` }

export default function NOIExcelButton({ propData, currency, totalIncome, totalExpenses, totalNOI, noiMargin, year }: Props) {
  const handleExport = () => {
    const blob = buildXlsxBlob({
      [`NOI ${year}`]: {
        cols: [
          { label: 'Property', width: 24 }, { label: 'Gross Income', width: 18 },
          { label: 'Expenses', width: 18 }, { label: 'Maint. Costs', width: 16 },
          { label: 'Total Costs', width: 18 }, { label: 'NOI', width: 18 }, { label: 'Margin', width: 10 },
        ],
        rows: [
          ...propData.map(p => [
            p.name, fmt(p.income, currency), fmt(p.expCost, currency),
            fmt(p.maintCost, currency), fmt(p.totalExpenses, currency),
            fmt(p.noi, currency),
            p.income > 0 ? `${((p.noi / p.income) * 100).toFixed(1)}%` : '—',
          ]),
          ['TOTAL', fmt(totalIncome, currency), '', '', fmt(totalExpenses, currency), fmt(totalNOI, currency), `${noiMargin}%`],
        ],
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `NOI_Report_${year}_${new Date().toISOString().slice(0,10)}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
      <Download size={14} /> Excel
    </button>
  )
}
