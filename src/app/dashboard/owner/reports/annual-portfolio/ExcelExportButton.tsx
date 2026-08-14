'use client'
import { Download } from 'lucide-react'
import { buildXlsxBlob } from '@/lib/xlsx-zip'

interface Props {
  year: number; propertyName: string; currency: string
  totalIncome: number; totalPending: number; totalExpenses: number; totalMaintCost: number; noi: number
  totalUnits: number; occupied: number; occupancyRate: number; activeContracts: number
  catRows: { cat: string; total: number }[]
}

function fmt(n: number, currency: string) {
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${currency}`
}

export default function AnnualPortfolioExcelButton(props: Props) {
  const handleExport = () => {
    const blob = buildXlsxBlob({
      'Summary': {
        cols: [{ label: 'Metric', width: 28 }, { label: 'Value', width: 20 }],
        rows: [
          ['Annual Portfolio Summary', `${props.year}`],
          ['Property Filter', props.propertyName],
          ['Currency', props.currency],
          ['', ''],
          ['Gross Rental Income', fmt(props.totalIncome, props.currency)],
          ['Pending / Outstanding', fmt(props.totalPending, props.currency)],
          ['Operating Expenses', fmt(props.totalExpenses, props.currency)],
          ['Maintenance Costs', fmt(props.totalMaintCost, props.currency)],
          ['Net Operating Income (NOI)', fmt(props.noi, props.currency)],
          ['', ''],
          ['Total Units', props.totalUnits],
          ['Occupied', props.occupied],
          ['Occupancy Rate', `${props.occupancyRate}%`],
          ['Active Contracts', props.activeContracts],
        ],
      },
      'Expense Categories': {
        cols: [{ label: 'Category', width: 22 }, { label: 'Total', width: 20 }],
        rows: props.catRows.map(c => [c.cat, fmt(c.total, props.currency)]),
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Annual_Portfolio_${props.year}_${new Date().toISOString().slice(0,10)}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
      <Download size={14} /> Excel
    </button>
  )
}
