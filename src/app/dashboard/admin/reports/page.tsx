import { createAdminClient } from '@/lib/supabase/server'
import { BarChart2, TrendingUp, CreditCard } from 'lucide-react'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reports' }

export default async function AdminReportsPage() {
  noStore()
  const admin = createAdminClient()

  const [orgs, props, units, tenants, contracts, maintenance, proofs] = await Promise.all([
    admin.from('organizations').select('subscription_plan, subscription_status, subscription_expires_at, created_at'),
    admin.from('properties').select('id, created_at'),
    admin.from('units').select('id, status'),
    admin.from('tenants').select('id, created_at'),
    admin.from('contracts').select('id, status'),
    admin.from('maintenance_requests').select('id, status, priority'),
    admin.from('subscription_payment_proofs').select('id, status, submitted_at'),
  ])

  const orgList = orgs.data ?? []
  const unitList = units.data ?? []
  const contractList = contracts.data ?? []
  const maintList = maintenance.data ?? []
  const proofList = proofs.data ?? []

  // Plan breakdown
  const byPlan = orgList.reduce((acc: Record<string, number>, o) => {
    acc[o.subscription_plan] = (acc[o.subscription_plan] ?? 0) + 1; return acc
  }, {})

  // Subscription status breakdown
  const bySubStatus = orgList.reduce((acc: Record<string, number>, o) => {
    acc[o.subscription_status] = (acc[o.subscription_status] ?? 0) + 1; return acc
  }, {})

  // Expiring within 30 days
  const in30days = new Date(Date.now() + 30 * 86400000)
  const expiringSoon = orgList.filter(o =>
    o.subscription_status === 'active' &&
    o.subscription_expires_at &&
    new Date(o.subscription_expires_at) <= in30days &&
    new Date(o.subscription_expires_at) > new Date()
  ).length

  // Payment proofs
  const pendingProofs  = proofList.filter(p => p.status === 'pending').length
  const reviewedProofs = proofList.filter(p => p.status === 'reviewed').length

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

      {/* Subscription section */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Status breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><CreditCard size={16}/>Subscription Status</h3>
          <div className="space-y-3">
            {[
              { key: 'active',   label: 'Active',   color: 'bg-green-500' },
              { key: 'trialing', label: 'Trialing', color: 'bg-yellow-400' },
              { key: 'past_due', label: 'Past Due', color: 'bg-red-500' },
              { key: 'canceled', label: 'Canceled', color: 'bg-slate-300' },
            ].map(({ key, label, color }) => {
              const count = bySubStatus[key] ?? 0
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{label}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div className={`h-full rounded-full ${color}`}
                      style={{ width: orgList.length > 0 ? `${(count / orgList.length) * 100}%` : '0%' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Expiry & renewals */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><CreditCard size={16}/>Renewals</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
              <span className="text-sm text-amber-800 font-medium">Expiring in 30 days</span>
              <span className="text-2xl font-black text-amber-700">{expiringSoon}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
              <span className="text-sm text-green-800 font-medium">Active subscriptions</span>
              <span className="text-2xl font-black text-green-700">{bySubStatus['active'] ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
              <span className="text-sm text-red-800 font-medium">Past due</span>
              <span className="text-2xl font-black text-red-700">{bySubStatus['past_due'] ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Payment proofs */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><CreditCard size={16}/>Payment Proofs</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
              <span className="text-sm text-amber-800 font-medium">Pending review</span>
              <span className="text-2xl font-black text-amber-700">{pendingProofs}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
              <span className="text-sm text-green-800 font-medium">Reviewed & approved</span>
              <span className="text-2xl font-black text-green-700">{reviewedProofs}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600 font-medium">Total submitted</span>
              <span className="text-2xl font-black text-slate-700">{proofList.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
