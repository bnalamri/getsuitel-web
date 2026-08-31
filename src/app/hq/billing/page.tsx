import { createClient } from '@/lib/supabase/server'
import { CreditCard, AlertCircle } from 'lucide-react'
import OmrSymbol from '@/components/ui/OmrSymbol'

export default async function HQBillingPage() {
  const supabase = await createClient()

  const { data: billing } = await supabase
    .from('branch_billing')
    .select(`
      id, month, total_revenue_omr, share_amount_omr, license_fee_omr, status, paid_at, notes,
      branches ( display_name, city )
    `)
    .order('month', { ascending: false })
    .limit(50)

  const totalPending  = billing?.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.share_amount_omr) + Number(r.license_fee_omr), 0) ?? 0
  const totalCollected = billing?.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.share_amount_omr) + Number(r.license_fee_omr), 0) ?? 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Branch Billing</h1>
        <p className="text-sm text-gray-500">License fees and revenue share per branch per month</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-green-100 flex items-center justify-center">
            <OmrSymbol variant="dark" size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 flex items-center gap-1">Total Collected <OmrSymbol variant="dark" size={13} /></p>
            <p className="text-2xl font-bold text-gray-900">{totalCollected.toFixed(3)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-yellow-100 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-yellow-700" />
          </div>
          <div>
            <p className="text-xs text-gray-500 flex items-center gap-1">Pending Collection <OmrSymbol variant="dark" size={13} /></p>
            <p className="text-2xl font-bold text-gray-900">{totalPending.toFixed(3)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Billing Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Branch</th>
                <th className="px-5 py-3 text-left">Month</th>
                <th className="px-5 py-3 text-right"><span className="flex items-center justify-end gap-1">Revenue <OmrSymbol variant="dark" size={13} /></span></th>
                <th className="px-5 py-3 text-right"><span className="flex items-center justify-end gap-1">Share <OmrSymbol variant="dark" size={13} /></span></th>
                <th className="px-5 py-3 text-right"><span className="flex items-center justify-end gap-1">License <OmrSymbol variant="dark" size={13} /></span></th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!billing?.length ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No billing records yet</td></tr>
              ) : billing.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {(r.branches as { display_name: string } | null)?.display_name ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {new Date(r.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </td>
                  <td className="px-5 py-3 text-right">{Number(r.total_revenue_omr).toFixed(3)}</td>
                  <td className="px-5 py-3 text-right">{Number(r.share_amount_omr).toFixed(3)}</td>
                  <td className="px-5 py-3 text-right">{Number(r.license_fee_omr).toFixed(3)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
