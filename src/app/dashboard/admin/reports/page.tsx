import { createAdminClient } from '@/lib/supabase/server'
import { BarChart2, TrendingUp } from 'lucide-react'

export const metadata = { title: 'Reports' }

export default async function AdminReportsPage() {
  const admin = createAdminClient()

  const [orgs, props, units, tenants, contracts, maintenance] = await Promise.all([
    admin.from('organizations').select('subscription_plan, subscription_status, created_at'),
    admin.from('properties').select('id, created_at'),
    admin.from('units').select('id, status'),
    admin.from('tenants').select('id, created_at'),
    admin.from('contracts').select('id, status'),
    admin.from('maintenance_requests').select('id, status, priority'),
  ])

  const orgList = orgs.data ?? []
  const unitList = units.data ?? []
  const contractList = contracts.data ?? []
  const maintList = maintenance.data ?? []

  // Plan breakdown
  const byPlan = orgList.reduce((acc: Record<string, number>, o) => {
    acc[o.subscription_plan] = (acc[o.subscription_plan] ?? 0) + 1; return acc
  }, {})

  // Unit status breakdown
  const byUnitStatus = unitList.reduce((acc: Record<string, number>, u) => {
    acc[u.status] = (acc[u.status] ?? 0) + 1; return acc
  }, {})

  // Maintenance priority breakdown
  const byPriority = maintList.reduce((acc: Record<string, number>, m) => {
    acc[m.priority] = (acc[m.priority] ?? 0) + 1; return acc
  }, {})

  const occupancyRate = unitList.length > 0
    ? Math.round((unitList.filter(u => u.status === 'occupied').length / unitList.length) * 100)
    : 0

  const activeContracts = contractList.filter(c => c.status === 'active').length
  const openMaint = maintList.filter(m => !['completed','canceled'].includes(m.status)).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Platform Reports</h2>
        <p className="text-slate-500 text-sm mt-0.5">Aggregated data across all organizations</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orgs', value: orgList.length, color: 'text-navy-700' },
          { label: 'Total Properties', value: props.data?.length ?? 0, color: 'text-purple-700' },
          { label: 'Occupancy Rate', value: `${occupancyRate}%`, color: 'text-emerald-700' },
          { label: 'Active Contracts', value: activeContracts, color: 'text-blue-700' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-sm text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Plan distribution */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><BarChart2 size={16} />Plans</h3>
          <div className="space-y-3">
            {Object.entries(byPlan).map(([plan, count]) => (
              <div key={plan}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-slate-700">{plan}</span>
                  <span className="font-semibold">{count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full">
                  <div className="h-full bg-navy-700 rounded-full" style={{ width: `${(count / orgList.length) * 100}%` }} />
                </div>
              </div>
            ))}
            {Object.keys(byPlan).length === 0 && <div className="text-slate-400 text-sm text-center py-4">No data</div>}
          </div>
        </div>

        {/* Unit status */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={16} />Unit Status</h3>
          <div className="space-y-3">
            {Object.entries(byUnitStatus).map(([status, count]) => (
              <div key={status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-slate-700">{status}</span>
                  <span className="font-semibold">{count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full">
                  <div className={`h-full rounded-full ${status === 'occupied' ? 'bg-emerald-500' : status === 'vacant' ? 'bg-blue-400' : 'bg-slate-300'}`}
                    style={{ width: `${(count / unitList.length) * 100}%` }} />
                </div>
              </div>
            ))}
            {Object.keys(byUnitStatus).length === 0 && <div className="text-slate-400 text-sm text-center py-4">No data</div>}
          </div>
        </div>

        {/* Maintenance priority */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><BarChart2 size={16} />Maintenance</h3>
          <div className="mb-3 text-center">
            <div className="text-3xl font-black text-orange-600">{openMaint}</div>
            <div className="text-xs text-slate-500">open requests</div>
          </div>
          <div className="space-y-3">
            {Object.entries(byPriority).map(([priority, count]) => {
              const colors: Record<string, string> = { urgent:'bg-red-500', high:'bg-orange-500', medium:'bg-yellow-400', low:'bg-slate-300' }
              return (
                <div key={priority}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-slate-700">{priority}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div className={`h-full rounded-full ${colors[priority] ?? 'bg-slate-400'}`}
                      style={{ width: `${maintList.length > 0 ? (count / maintList.length) * 100 : 0}%` }} />
                  </div>
                </div>
              )
            })}
            {Object.keys(byPriority).length === 0 && <div className="text-slate-400 text-sm text-center py-4">No data</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
