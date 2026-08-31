import { createClient } from '@/lib/supabase/server'
import { CreditCard, AlertCircle, AlertTriangle } from 'lucide-react'
import OmrSymbol from '@/components/ui/OmrSymbol'
import BillingTable from './BillingTable'
import GenerateBillingButton from './GenerateBillingButton'

export default async function HQBillingPage() {
  const supabase = await createClient()

  // Current month key (1st of month)
  const now = new Date()
  const currentMonthKey = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .substring(0, 10)

  const [{ data: billing }, { data: allBranches }, { data: currentMonthBilling }] = await Promise.all([
    supabase
      .from('branch_billing')
      .select(`
        id, month, total_revenue_omr, share_amount_omr, license_fee_omr, status, paid_at, notes,
        branches ( display_name, city )
      `)
      .order('month', { ascending: false })
      .limit(100),

    // All active branches for license tracker
    supabase
      .from('branches')
      .select('id, display_name, license_fee_omr, status')
      .in('status', ['active', 'suspended']),

    // Current month billing records
    supabase
      .from('branch_billing')
      .select('branch_id')
      .eq('month', currentMonthKey),
  ])

  const totalPending   = billing?.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.share_amount_omr) + Number(r.license_fee_omr), 0) ?? 0
  const totalCollected = billing?.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.share_amount_omr) + Number(r.license_fee_omr), 0) ?? 0

  // Branches that have NO billing record for the current month
  const billedBranchIds = new Set(currentMonthBilling?.map(r => r.branch_id) ?? [])
  const missingBranches = (allBranches ?? []).filter(b => !billedBranchIds.has(b.id))

  const displayMonth = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branch Billing</h1>
          <p className="text-sm text-gray-500">License fees and revenue share per branch per month</p>
        </div>
        <GenerateBillingButton currentMonth={currentMonthKey} />
      </div>

      {/* Summary stat cards */}
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

      {/* License Tracker — branches missing current-month billing */}
      {missingBranches.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-800">
              License Tracker — Missing {displayMonth} Records ({missingBranches.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-amber-700 uppercase text-xs">
                <tr>
                  <th className="px-5 py-3 text-left">Branch</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">
                    <span className="flex items-center justify-end gap-1">License Fee <OmrSymbol variant="dark" size={13} /></span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-50">
                {missingBranches.map(b => (
                  <tr key={b.id} className="hover:bg-amber-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <a href={`/hq/branches/${b.id}`} className="hover:text-yellow-600">
                        {b.display_name}
                      </a>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">{Number(b.license_fee_omr).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
            <p className="text-xs text-amber-700">
              Use the <strong>Generate Billing</strong> button above to create records for {displayMonth}.
            </p>
          </div>
        </div>
      )}

      {/* Billing records table (client component with mark-paid + CSV export) */}
      <BillingTable billing={(billing ?? []) as Parameters<typeof BillingTable>[0]['billing']} />
    </div>
  )
}
