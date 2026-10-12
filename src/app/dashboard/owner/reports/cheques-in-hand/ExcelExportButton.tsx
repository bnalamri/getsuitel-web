'use client'
import { Download } from 'lucide-react'
import { buildXlsxBlob } from '@/lib/xlsx-zip'

interface Row {
  tenant: string; unit: string; property: string
  inHand: number; inHandAmount: number
  nextDue: string | null; lastDue: string | null
  firstNo: string | null; lastNo: string | null
  deposited: number; contractEnd: string | null
  level: 'none' | 'last' | 'low' | 'ok'
}
interface Props { rows: Row[]; currency: string; totalInHand: number; totalAmount: number }

const LEVEL_LABEL: Record<Row['level'], string> = {
  none: 'None in hand', last: 'Last cheque', low: 'Running low', ok: 'OK',
}
const d = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-GB') : '—')
const fmt = (n: number, c: string) =>
  `${n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${c}`

export default function ChequesInHandExcelButton({ rows, currency, totalInHand, totalAmount }: Props) {
  const handleExport = () => {
    const blob = buildXlsxBlob({
      'Cheques in Hand': {
        cols: [
          { label: 'Tenant', width: 24 }, { label: 'Property', width: 22 }, { label: 'Unit', width: 10 },
          { label: 'Cheques in Hand', width: 16 }, { label: 'Value in Hand', width: 18 },
          { label: 'Next Due', width: 14 }, { label: 'Last Cheque Date', width: 18 },
          { label: 'First Cheque #', width: 16 }, { label: 'Last Cheque #', width: 16 },
          { label: 'Deposited (uncleared)', width: 20 }, { label: 'Contract Ends', width: 14 },
          { label: 'Status', width: 14 },
        ],
        rows: [
          ...rows.map(r => [
            r.tenant, r.property, r.unit, r.inHand,
            r.inHandAmount > 0 ? fmt(r.inHandAmount, currency) : '—',
            d(r.nextDue), d(r.lastDue), r.firstNo ?? '—', r.lastNo ?? '—',
            r.deposited, d(r.contractEnd), LEVEL_LABEL[r.level],
          ]),
          ['TOTAL', '', '', totalInHand, fmt(totalAmount, currency), '', '', '', '', '', '', ''],
        ],
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Cheques_In_Hand_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
      <Download size={14} /> Excel
    </button>
  )
}
