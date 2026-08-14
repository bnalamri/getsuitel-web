import { createAdminClient, createClient } from '@/lib/supabase/server'
import { TrendingUp, Building2, UserCheck, XCircle } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'
import ExcelExportButton from './ExcelExportButton'

export const metadata = { title: 'Platform Growth Report' }
export const dynamic = 'force-dynamic'

export default async function PlatformGrowthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: adminProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const printerName = (adminProfile?.full_name as string) || user.email || 'Superadmin'

  const admin = createAdminClient()
  const today = new Date()
  const printDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  // Fetch all orgs
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, created_at, subscription_status, subscription_plan, canceled_at')
    .order('created_at', { ascending: true })

  const orgList = (orgs ?? []) as {
    id: string; created_at: string; subscription_status: string;
    subscription_plan: string; canceled_at: string | null;
  }[]

  // Build 12-month history
  const months: { key: string; label: string; new: number; activated: number; churned: number; cumulative: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
    const newOrgs = orgList.filter(o => o.created_at.startsWith(key)).length
    const activated = orgList.filter(o => o.created_at.startsWith(key) && o.subscription_status === 'active').length
    const churned = orgList.filter(o => o.canceled_at?.startsWith(key)).length
    months.push({ key, label, new: newOrgs, activated, churned, cumulative: 0 })
  }

  // Cumulative
  let running = 0
  for (const m of months) {
    running += m.new - m.churned
    m.cumulative = running
  }

  const totalOrgs = orgList.length
  const activeOrgs = orgList.filter(o => o.subscription_status === 'active').length
  const trialingOrgs = orgList.filter(o => o.subscription_status === 'trialing').length
  const churnedOrgs = orgList.filter(o => o.subscription_status === 'canceled').length

  // This month vs last month
  const thisMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
  const newThisMonth = orgList.filter(o => o.created_at.startsWith(thisMonthKey)).length
  const newLastMonth = orgList.filter(o => o.created_at.startsWith(lastMonthKey)).length
  const growthPct = newLastMonth > 0 ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) : null

  const maxNew = Math.max(...months.map(m => m.new), 1)

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Platform Growth Report</h2>
          <p className="text-slate-500 text-sm mt-0.5">New org registrations, activations, and churn per month</p>
        </div>
        <div className="flex items-center gap-2">
          <ExcelExportButton
            totalOrgs={totalOrgs} activeOrgs={activeOrgs} trialingOrgs={trialingOrgs} churnedOrgs={churnedOrgs}
            growthPct={growthPct} newThisMonth={newThisMonth} newLastMonth={newLastMonth}
            months={months}
          />
          <PrintButton />
        </div>
      </div>
      <PrintHeader reportTitle="Platform Growth Report" orgName="GetSuitel" userName={printerName} printDate={printDate} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orgs',     value: totalOrgs.toString(),                                        color: 'text-slate-700', icon: Building2 },
          { label: 'Active',         value: activeOrgs.toString(),                                       color: 'text-emerald-700', icon: UserCheck },
          { label: 'Trialing',       value: trialingOrgs.toString(),                                     color: 'text-amber-600', icon: TrendingUp },
          { label: 'Churned',        value: churnedOrgs.toString(),                                      color: 'text-red-600',   icon: XCircle },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <s.icon size={20} className={s.color} />
            <div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {growthPct != null && (
        <div className={`card p-4 flex items-center gap-3 border ${growthPct >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          {growthPct >= 0 ? <TrendingUp size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-red-600" />}
          <span className={`font-semibold text-sm ${growthPct >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
            {growthPct >= 0 ? '+' : ''}{growthPct}% MoM growth — {newThisMonth} new orgs this month vs {newLastMonth} last month
          </span>
        </div>
      )}

      {/* Bar chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">New Registrations — Last 12 Months</h3>
        <div className="flex items-end gap-2 h-36">
          {months.map(m => (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-slate-600 font-semibold">{m.new > 0 ? m.new : ''}</span>
              <div className="w-full bg-navy-500 rounded-t" style={{ height: `${Math.round((m.new / maxNew) * 100)}%`, minHeight: m.new > 0 ? '4px' : '0' }}
                title={`${m.label}: ${m.new} new`} />
              <span className="text-xs text-slate-400">{m.label.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Monthly Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Month</th>
                <th className="px-4 py-3 font-semibold text-slate-600">New Orgs</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Activated</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Churned</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Cumulative</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...months].reverse().map((m, i) => (
                <tr key={m.key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                  <td className="px-4 py-3 font-medium text-slate-800">{m.label}</td>
                  <td className="px-4 py-3 text-blue-700 font-semibold">{m.new}</td>
                  <td className="px-4 py-3 text-emerald-600">{m.activated}</td>
                  <td className="px-4 py-3 text-red-500">{m.churned}</td>
                  <td className="px-4 py-3 text-slate-700 font-semibold">{m.cumulative}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
