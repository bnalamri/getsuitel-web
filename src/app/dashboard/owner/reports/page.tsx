import { createClient } from '@/lib/supabase/server'
import { BarChart2 } from 'lucide-react'

export const metadata = { title: 'Reports' }

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found</div>

  const [invoices, maintenance, units] = await Promise.all([
    supabase.from('invoices').select('amount, status, type, created_at').eq('organization_id', orgId),
    supabase.from('maintenance_requests').select('status, category, priority').eq('organization_id', orgId),
    supabase.from('units').select('status').eq('organization_id', orgId),
  ])

  const inv = invoices.data ?? []
  const maint = maintenance.data ?? []
  const u = units.data ?? []

  const totalRevenue = inv.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const pendingRevenue = inv.filter(i => ['sent','overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0)
  const occupancyRate = u.length > 0 ? Math.round((u.filter(x => x.status === 'occupied').length / u.length) * 100) : 0
  const openMaint = maint.filter(m => m.status !== 'completed' && m.status !== 'canceled').length
  const completedMaint = maint.filter(m => m.status === 'completed').length

  const byCategory = maint.reduce((acc: Record<string, number>, m) => { acc[m.category] = (acc[m.category] ?? 0) + 1; return acc }, {})
  const byType = inv.reduce((acc: Record<string, number>, i) => { acc[i.type] = (acc[i.type] ?? 0) + Number(i.amount); return acc }, {})

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
        <p className="text-slate-500 text-sm mt-0.5">Financial and operational overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `${totalRevenue.toLocaleString()} OMR`, color: 'text-emerald-700' },
          { label: 'Pending Revenue', value: `${pendingRevenue.toLocaleString()} OMR`, color: 'text-orange-600' },
          { label: 'Occupancy Rate', value: `${occupancyRate}%`, color: 'text-navy-700' },
          { label: 'Open Maintenance', value: openMaint, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><BarChart2 size={16} />Revenue by Type</h3>
          {Object.keys(byType).length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-4">No invoice data yet</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(byType).map(([type, amount]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-slate-700">{type}</span>
                    <span className="font-medium text-slate-900">{Number(amount).toLocaleString()} OMR</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div className="h-full bg-navy-700 rounded-full" style={{ width: `${Math.min((Number(amount) / (totalRevenue + pendingRevenue || 1)) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><BarChart2 size={16} />Maintenance by Category</h3>
          {Object.keys(byCategory).length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-4">No maintenance data yet</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-slate-700">{cat}</span>
                    <span className="font-medium text-slate-900">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(count / maint.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm text-slate-600">
            <span>{completedMaint} completed</span><span>{openMaint} open</span>
          </div>
        </div>
      </div>
    </div>
  )
}
