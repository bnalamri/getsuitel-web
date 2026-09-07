'use client'
import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buildXlsxBlob, type XlsxCell } from '@/lib/xlsx-zip'

// Moved here from HQ Settings (was item #399 on the original build checklist,
// which scoped it as a generic Settings utility) — Badar pointed out these
// are data exports, not account/config settings, and belong with the rest
// of the Reports hub instead. Logic is unchanged from Settings, just
// relocated + rendered with the hub's card styling.

function today() {
  return new Date().toISOString().split('T')[0]
}

function downloadXlsx(sheetName: string, cols: { label: string; width?: number }[], rows: XlsxCell[][], filename: string) {
  if (!rows.length) return
  const blob = buildXlsxBlob({ [sheetName]: { cols, rows } })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function DataExportCard() {
  const [exportLoading, setExportLoading] = useState<string | null>(null)

  async function exportData(type: 'branches' | 'billing') {
    setExportLoading(type)
    const supabase = createClient()

    if (type === 'branches') {
      const { data } = await supabase
        .from('branches')
        .select('name, city, region, status, license_fee_omr, revenue_share_pct, created_at')
        .order('created_at', { ascending: false })
      const rows: XlsxCell[][] = (data ?? []).map(r => [
        r.name ?? '', r.city ?? '', r.region ?? '', r.status ?? '',
        r.license_fee_omr ?? 0, r.revenue_share_pct ?? 0, r.created_at ?? '',
      ])
      downloadXlsx('Branches', [
        { label: 'Name', width: 26 }, { label: 'City', width: 16 }, { label: 'Region', width: 18 },
        { label: 'Status', width: 12 }, { label: 'License Fee (OMR)', width: 16 },
        { label: 'Revenue Share (%)', width: 16 }, { label: 'Created At', width: 22 },
      ], rows, `getsuitel_branches_${today()}.xlsx`)
    } else {
      // branch_billing's real columns (20260831_hq_layer0.sql) are month /
      // total_revenue_omr / share_amount_omr / license_fee_omr / paid_at.
      const { data } = await supabase
        .from('branch_billing')
        .select('branches(display_name), month, total_revenue_omr, share_amount_omr, license_fee_omr, status, paid_at, notes')
        .order('month', { ascending: false })
      const rows: XlsxCell[][] = (data ?? []).map(r => {
        const branchRow = Array.isArray(r.branches) ? r.branches[0] : r.branches
        return [
          branchRow?.display_name ?? '', r.month ?? '', r.total_revenue_omr ?? 0,
          r.share_amount_omr ?? 0, r.license_fee_omr ?? 0, r.status ?? '',
          r.paid_at ?? '', r.notes ?? '',
        ]
      })
      downloadXlsx('Billing', [
        { label: 'Branch', width: 30 }, { label: 'Month', width: 14 },
        { label: 'Total Revenue (OMR)', width: 16 }, { label: 'Share Amount (OMR)', width: 16 },
        { label: 'License Fee (OMR)', width: 16 }, { label: 'Status', width: 12 },
        { label: 'Paid At', width: 22 }, { label: 'Notes', width: 30 },
      ], rows, `getsuitel_billing_${today()}.xlsx`)
    }

    setExportLoading(null)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Download className="w-4 h-4 text-yellow-600" />
        <h2 className="font-semibold text-gray-900">Data Export</h2>
        <span className="ml-auto text-xs text-gray-400">Downloads as Excel (.xlsx)</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-800">Branches Report</p>
            <p className="text-xs text-gray-400">Name, city, region, status, fees</p>
          </div>
          <button
            onClick={() => exportData('branches')}
            disabled={exportLoading === 'branches'}
            className="flex items-center gap-1.5 px-4 py-2 border border-yellow-400 text-yellow-700 hover:bg-yellow-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {exportLoading === 'branches'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            Export
          </button>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-800">Billing Records</p>
            <p className="text-xs text-gray-400">All branch billing history</p>
          </div>
          <button
            onClick={() => exportData('billing')}
            disabled={exportLoading === 'billing'}
            className="flex items-center gap-1.5 px-4 py-2 border border-yellow-400 text-yellow-700 hover:bg-yellow-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {exportLoading === 'billing'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            Export
          </button>
        </div>
      </div>
    </div>
  )
}
