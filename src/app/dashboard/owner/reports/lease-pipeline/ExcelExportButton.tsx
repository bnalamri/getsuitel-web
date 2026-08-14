'use client'
import { Download } from 'lucide-react'
import { buildXlsxBlob } from '@/lib/xlsx-zip'

interface Row {
  id: string; end_date: string; rent_amount: number; currency: string; daysLeft: number
  bucket: { label: string }
  tenants: { full_name: string; email: string; phone: string } | null
  units: { unit_number: string; properties: { name: string } | null } | null
}
interface Props { rows: Row[]; currency: string }

export default function LeasePipelineExcelButton({ rows, currency }: Props) {
  const handleExport = () => {
    const blob = buildXlsxBlob({
      'Expiring Leases': {
        cols: [
          { label: 'Tenant', width: 22 }, { label: 'Unit', width: 10 }, { label: 'Property', width: 22 },
          { label: 'Expiry Date', width: 14 }, { label: 'Days Left', width: 12 }, { label: 'Bucket', width: 16 },
          { label: 'Rent/mo', width: 16 }, { label: 'Contact', width: 24 },
        ],
        rows: rows.map(r => [
          r.tenants?.full_name ?? '—',
          (r.units as any)?.unit_number ?? '—',
          (r.units as any)?.properties?.name ?? '—',
          new Date(r.end_date).toLocaleDateString('en-GB'),
          r.daysLeft,
          r.bucket.label,
          `${r.rent_amount.toLocaleString('en-US', { minimumFractionDigits: 3 })} ${r.currency}`,
          r.tenants?.phone ?? r.tenants?.email ?? '—',
        ]),
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Lease_Pipeline_${new Date().toISOString().slice(0,10)}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
      <Download size={14} /> Excel
    </button>
  )
}
