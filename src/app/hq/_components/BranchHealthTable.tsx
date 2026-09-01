import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import OmrSymbol from '@/components/ui/OmrSymbol'
import { AlertTriangle } from 'lucide-react'

type HealthRow = {
  id: string
  display_name: string
  status: string
  units: number
  occupied: number
  open_maint: number
  revenue_omr: number
}

function OccupancyBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden" style={{ minWidth: 60 }}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-9 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}

const FINANCE_ROLES = ['hq_admin', 'hq_finance']

export default async function BranchHealthTable() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isFinance = FINANCE_ROLES.includes(profile?.role ?? '')

  // All active branches
  const { data: branches } = await supabase
    .from('branches')
    .select('id, display_name, status')
    .in('status', ['active', 'suspended'])
    .order('display_name')

  if (!branches?.length) return null

  const branchIds = branches.map(b => b.id)

  // Units per branch (via organization → branch)
  const { data: units } = await supabase
    .from('units')
    .select('id, organizations!inner(branch_id)')
    .in('organizations.branch_id', branchIds)

  // Active contracts per branch
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, organizations!inner(branch_id)')
    .eq('status', 'active')
    .in('organizations.branch_id', branchIds)

  // Open/in-progress maintenance per branch
  const { data: maint } = await supabase
    .from('maintenance_requests')
    .select('id, organizations!inner(branch_id)')
    .in('status', ['open', 'assigned', 'in_progress'])
    .in('organizations.branch_id', branchIds)

  // This month's billing
  const now = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const { data: billing } = await supabase
    .from('branch_billing')
    .select('branch_id, total_revenue_omr')
    .eq('month', monthStr)
    .in('branch_id', branchIds)

  // Aggregate per branch
  function countByBranch(rows: { organizations: { branch_id: string | null } | null }[] | null) {
    const map: Record<string, number> = {}
    rows?.forEach(r => {
      const bid = (r.organizations as { branch_id: string | null } | null)?.branch_id
      if (bid) map[bid] = (map[bid] ?? 0) + 1
    })
    return map
  }

  const unitMap     = countByBranch(units as never)
  const contractMap = countByBranch(contracts as never)
  const maintMap    = countByBranch(maint as never)
  const revenueMap: Record<string, number> = {}
  billing?.forEach(r => { revenueMap[r.branch_id] = Number(r.total_revenue_omr) })

  const rows: HealthRow[] = branches.map(b => ({
    id:           b.id,
    display_name: b.display_name,
    status:       b.status,
    units:        unitMap[b.id] ?? 0,
    occupied:     contractMap[b.id] ?? 0,
    open_maint:   maintMap[b.id] ?? 0,
    revenue_omr:  revenueMap[b.id] ?? 0,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Branch Health</h2>
        <p className="text-xs text-gray-400 mt-0.5">Occupancy, open maintenance & this month&apos;s revenue</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-5 py-3 text-left">Branch</th>
              <th className="px-5 py-3 text-center">Units</th>
              <th className="px-5 py-3 text-left" style={{ minWidth: 140 }}>Occupancy</th>
              <th className="px-5 py-3 text-center">Open Maint.</th>
              {isFinance && (
                <th className="px-5 py-3 text-right">
                  <span className="flex items-center justify-end gap-1">Revenue <OmrSymbol variant="dark" size={12} /></span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(r => {
              const pct = r.units > 0 ? (r.occupied / r.units) * 100 : 0
              return (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/hq/branches/${r.id}`} className="font-medium text-gray-900 hover:text-yellow-700">
                      {r.display_name}
                    </Link>
                    {r.status === 'suspended' && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 font-medium">suspended</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center text-gray-600">{r.units}</td>
                  <td className="px-5 py-3">
                    {r.units > 0 ? (
                      <OccupancyBar pct={pct} />
                    ) : (
                      <span className="text-xs text-gray-400 italic">No units</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {r.open_maint > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                        <AlertTriangle className="w-3 h-3" /> {r.open_maint}
                      </span>
                    ) : (
                      <span className="text-green-600 font-semibold">0</span>
                    )}
                  </td>
                  {isFinance && (
                    <td className="px-5 py-3 text-right">
                      <span className="flex items-center justify-end gap-1 text-gray-800 font-semibold">
                        <OmrSymbol variant="dark" size={12} />
                        {r.revenue_omr.toFixed(3)}
                      </span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
