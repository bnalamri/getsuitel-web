'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Download, Loader2 } from 'lucide-react'
import OmrSymbol from '@/components/ui/OmrSymbol'

type BillingRow = {
  id: string
  month: string
  total_revenue_omr: number
  share_amount_omr: number
  license_fee_omr: number
  status: string
  paid_at: string | null
  notes: string | null
  branches: { display_name: string; city: string | null } | null
}

function fmtMonth(m: string) {
  return new Date(m).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

function exportCSV(rows: BillingRow[]) {
  const headers = ['Branch', 'Month', 'Revenue (OMR)', 'Rev Share (OMR)', 'License Fee (OMR)', 'Total Due (OMR)', 'Status', 'Paid At']
  const lines = rows.map(r => [
    r.branches?.display_name ?? '',
    fmtMonth(r.month),
    Number(r.total_revenue_omr).toFixed(3),
    Number(r.share_amount_omr).toFixed(3),
    Number(r.license_fee_omr).toFixed(3),
    (Number(r.share_amount_omr) + Number(r.license_fee_omr)).toFixed(3),
    r.status,
    r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-US') : '',
  ])
  const csv = [headers, ...lines].map(row => row.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `getsuitel-billing-${new Date().toISOString().substring(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function BillingTable({ billing }: { billing: BillingRow[] }) {
  const router = useRouter()
  const [paying, setPaying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function markPaid(id: string) {
    setPaying(id)
    setError(null)
    try {
      const res = await fetch('/api/hq/billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to mark as paid')
        return
      }
      router.refresh()
    } finally {
      setPaying(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Billing Records</h2>
        <button
          onClick={() => exportCSV(billing)}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-5 py-3 text-left">Branch</th>
              <th className="px-5 py-3 text-left">Month</th>
              <th className="px-5 py-3 text-right">
                <span className="flex items-center justify-end gap-1">Revenue <OmrSymbol variant="dark" size={13} /></span>
              </th>
              <th className="px-5 py-3 text-right">
                <span className="flex items-center justify-end gap-1">Rev Share <OmrSymbol variant="dark" size={13} /></span>
              </th>
              <th className="px-5 py-3 text-right">
                <span className="flex items-center justify-end gap-1">License <OmrSymbol variant="dark" size={13} /></span>
              </th>
              <th className="px-5 py-3 text-right">
                <span className="flex items-center justify-end gap-1">Total Due <OmrSymbol variant="dark" size={13} /></span>
              </th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!billing.length ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-gray-400">No billing records yet</td>
              </tr>
            ) : billing.map(r => {
              const totalDue = Number(r.share_amount_omr) + Number(r.license_fee_omr)
              const isPending = r.status === 'pending'
              const isThisRow = paying === r.id
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {r.branches?.display_name ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{fmtMonth(r.month)}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{Number(r.total_revenue_omr).toFixed(3)}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{Number(r.share_amount_omr).toFixed(3)}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{Number(r.license_fee_omr).toFixed(3)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">{totalDue.toFixed(3)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {r.status}
                    </span>
                    {r.paid_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(r.paid_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {isPending ? (
                      <button
                        onClick={() => markPaid(r.id)}
                        disabled={!!paying}
                        className="flex items-center gap-1.5 text-xs bg-green-600 text-white rounded-lg px-3 py-1.5 hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {isThisRow
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <CheckCircle className="w-3 h-3" />}
                        Mark Paid
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
