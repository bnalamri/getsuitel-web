'use client'
import { Download } from 'lucide-react'
import { buildXlsxBlob } from '@/lib/xlsx-zip'

interface MonthRow { label: string; contractsActive: number; income: number; expenses: number; net: number }
interface Props { months: MonthRow[]; currency: string; totalForecastIncome: number; totalForecastExpenses: number; totalNet: number }

function fmt(n: number, c: string) { return `${n.toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3})} ${c}` }

export default function CashFlowExcelButton({ months, currency, totalForecastIncome, totalForecastExpenses, totalNet }: Props) {
  const handleExport = () => {
    const blob = buildXlsxBlob({
      '6-Month Forecast': {
        cols: [
          { label: 'Month', width: 14 }, { label: 'Active Contracts', width: 16 },
          { label: 'Expected Income', width: 20 }, { label: 'Est. Expenses', width: 18 }, { label: 'Net Cash Flow', width: 18 },
        ],
        rows: [
          ...months.map(m => [m.label, m.contractsActive, fmt(m.income, currency), fmt(m.expenses, currency), fmt(m.net, currency)]),
          ['6-Month Total', '', fmt(totalForecastIncome, currency), fmt(totalForecastExpenses, currency), fmt(totalNet, currency)],
        ],
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Cash_Flow_Forecast_${new Date().toISOString().slice(0,10)}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
      <Download size={14} /> Excel
    </button>
  )
}
