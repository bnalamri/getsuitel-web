'use client'
import { Download } from 'lucide-react'
import { buildXlsxBlob } from '@/lib/xlsx-zip'

interface Row {
  id: string; amount: number; currency: string; due_date: string; daysPast: number
  tenants: { full_name: string } | null
  units: { unit_number: string; properties: { name: string } | null } | null
}
interface Props { rows: Row[]; grandTotal: number; currency: string }

function fmt(n: number, c: string) { return `${n.toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3})} ${c}` }

export default function PaymentAgingExcelButton({ rows, grandTotal, currency }: Props) {
  const handleExport = () => {
    const blob = buildXlsxBlob({
      'Overdue Invoices': {
        cols: [
          { label: 'Tenant', width: 22 }, { label: 'Unit', width: 10 }, { label: 'Property', width: 22 },
          { label: 'Due Date', width: 14 }, { label: 'Days Overdue', width: 14 }, { label: 'Amount', width: 18 },
        ],
        rows: [
          ...rows.map(r => [
            r.tenants?.full_name ?? '—',
            (r.units as any)?.unit_number ?? '—',
            (r.units as any)?.properties?.name ?? '—',
            new Date(r.due_date).toLocaleDateString('en-GB'),
            r.daysPast,
            fmt(r.amount, r.currency),
          ]),
          ['', '', '', '', 'GRAND TOTAL', fmt(grandTotal, currency)],
        ],
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Payment_Aging_${new Date().toISOString().slice(0,10)}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
      <Download size={14} /> Excel
    </button>
  )
}
