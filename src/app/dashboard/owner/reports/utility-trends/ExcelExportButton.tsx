'use client'
import { Download } from 'lucide-react'
import { buildXlsxBlob } from '@/lib/xlsx-zip'

interface TypeRow  { type: string;  count: number; total: number }
interface PropRow  { name: string;  count: number; total: number }
interface PayerRow { payer: string; count: number; total: number }
interface MonthRow { month: string; label: string; count: number; total: number }
interface StatusRow{ status: string;count: number; total: number }

interface Props {
  typeRows:   TypeRow[]
  propRows:   PropRow[]
  payerRows:  PayerRow[]
  monthRows:  MonthRow[]
  statusRows: StatusRow[]
  total:      number
  currency:   string
}

const TYPE_LABEL: Record<string, string> = { water: 'Water', electricity: 'Electricity', internet: 'Internet' }
function fmt(n: number, c: string) {
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${c}`
}

export default function UtilityTrendsExcelButton({ typeRows, propRows, payerRows, monthRows, statusRows, total, currency }: Props) {
  const handleExport = () => {
    const blob = buildXlsxBlob({
      'Summary': {
        cols: [{ label: 'Metric', width: 24 }, { label: 'Value', width: 20 }],
        rows: [
          ['Total Bills',       typeRows.reduce((s, r) => s + r.count, 0)],
          ['Total Amount',      fmt(total, currency)],
          ['Paid',              fmt(statusRows.find(r => r.status === 'paid')?.total ?? 0, currency)],
          ['Outstanding',       fmt((statusRows.find(r => r.status === 'pending')?.total ?? 0) + (statusRows.find(r => r.status === 'invoiced')?.total ?? 0), currency)],
        ],
      },
      'By Utility Type': {
        cols: [
          { label: 'Type',         width: 16 },
          { label: 'Bills',        width: 10 },
          { label: 'Total Amount', width: 20 },
          { label: 'Avg / Bill',   width: 20 },
          { label: '% of Total',   width: 14 },
        ],
        rows: [
          ...typeRows.map(r => [
            TYPE_LABEL[r.type] ?? r.type,
            r.count,
            fmt(r.total, currency),
            fmt(r.count > 0 ? r.total / r.count : 0, currency),
            total > 0 ? `${Math.round((r.total / total) * 100)}%` : '0%',
          ]),
          ['TOTAL', typeRows.reduce((s, r) => s + r.count, 0), fmt(total, currency), '', '100%'],
        ],
      },
      'By Property': {
        cols: [
          { label: 'Property',     width: 26 },
          { label: 'Bills',        width: 10 },
          { label: 'Total Amount', width: 20 },
        ],
        rows: propRows.map(p => [p.name, p.count, fmt(p.total, currency)]),
      },
      'Monthly Trend': {
        cols: [
          { label: 'Month',        width: 16 },
          { label: 'Bills',        width: 10 },
          { label: 'Total Amount', width: 20 },
        ],
        rows: monthRows.map(r => [r.label, r.count || 0, r.total > 0 ? fmt(r.total, currency) : '—']),
      },
      'By Status': {
        cols: [
          { label: 'Status',       width: 14 },
          { label: 'Bills',        width: 10 },
          { label: 'Amount',       width: 20 },
        ],
        rows: statusRows.map(s => [s.status, s.count, fmt(s.total, currency)]),
      },
      'By Billed To': {
        cols: [
          { label: 'Billed To',    width: 14 },
          { label: 'Bills',        width: 10 },
          { label: 'Amount',       width: 20 },
        ],
        rows: payerRows.map(p => [p.payer, p.count, fmt(p.total, currency)]),
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Utility_Trends_${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
    >
      <Download size={14} /> Excel
    </button>
  )
}
