'use client'
import { Download } from 'lucide-react'
import { buildXlsxBlob } from '@/lib/xlsx-zip'

interface PropRow { name: string; expiredLeases: number; renewed: number; vacated: number; rate: number | null }
interface VacatedRow {
  id: string; end_date: string;
  tenants: { full_name: string; email: string } | null;
  units: { unit_number: string; properties: { name: string } | null } | null;
}
interface Props {
  propRetention: PropRow[]
  vacatedTenants: VacatedRow[]
  renewedCount: number
  vacatedCount: number
  retentionRate: number
  expiredTotal: number
}

export default function TenantRetentionExcelButton({ propRetention, vacatedTenants, renewedCount, vacatedCount, retentionRate, expiredTotal }: Props) {
  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10)
    const blob = buildXlsxBlob({
      'Summary': {
        cols: [
          { label: 'Expired Leases', width: 18 }, { label: 'Renewed', width: 14 },
          { label: 'Vacated', width: 14 }, { label: 'Retention Rate', width: 16 },
        ],
        rows: [
          [expiredTotal.toString(), renewedCount.toString(), vacatedCount.toString(), `${retentionRate}%`],
        ],
      },
      'By Property': {
        cols: [
          { label: 'Property', width: 24 }, { label: 'Expired Leases', width: 18 },
          { label: 'Renewed', width: 14 }, { label: 'Vacated', width: 14 }, { label: 'Retention Rate', width: 16 },
        ],
        rows: propRetention.map(p => [
          p.name, p.expiredLeases.toString(), p.renewed.toString(),
          p.vacated.toString(), p.rate != null ? `${p.rate}%` : '—',
        ]),
      },
      'Vacated Tenants': {
        cols: [
          { label: 'Tenant', width: 24 }, { label: 'Unit', width: 12 },
          { label: 'Property', width: 24 }, { label: 'Lease Ended', width: 16 },
        ],
        rows: vacatedTenants.map(t => [
          t.tenants?.full_name ?? '—',
          t.units?.unit_number ?? '—',
          t.units?.properties?.name ?? '—',
          new Date(t.end_date).toLocaleDateString('en-GB'),
        ]),
      },
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Tenant_Retention_${date}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
      <Download size={14} /> Excel
    </button>
  )
}
