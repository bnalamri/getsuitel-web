import { createClient, createAdminClient } from '@/lib/supabase/server'
import { User, Clock, CheckCircle } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'
import PropertySelectClient from '@/components/PropertySelectClient'
import TechExcelButton from './ExcelExportButton'
import OmrAmount from '@/components/OmrAmount'

export const metadata = { title: 'Technician Performance Report' }
export const dynamic = 'force-dynamic'

function fmtAmt(n: number, currency = 'OMR') {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}

export default async function TechPerformancePage({ searchParams }: { searchParams: Promise<{ property_id?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id, full_name').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return null
  const userName = (profile?.full_name as string) || user.email || ''

  const admin = createAdminClient()
  const today = new Date()
  const printDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const sp = await searchParams
  const propertyId = sp?.property_id ?? ''

  const [maintRes, orgRes, propertiesRes] = await Promise.all([
    admin.from('maintenance_requests')
      .select('id, status, priority, charge_amount, charge_payer, created_at, completed_at, assigned_to_name, category, units(property_id)')
      .eq('organization_id', orgId),
    admin.from('organizations').select('name, default_currency').eq('id', orgId).single(),
    admin.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
  ])

  const currency = (orgRes.data?.default_currency as string) ?? 'OMR'
  const orgName = (orgRes.data?.name as string) ?? ''
  const properties = (propertiesRes.data ?? []) as { id: string; name: string }[]

  type MaintRow = {
    id: string; status: string; priority: string; charge_amount: number | null;
    created_at: string; completed_at: string | null; assigned_to_name: string | null; category: string;
    units: { property_id: string } | null;
  }
  const allMaint = (maintRes.data ?? []) as MaintRow[]

  // Apply property filter
  const maint = propertyId ? allMaint.filter(m => m.units?.property_id === propertyId) : allMaint

  // Group by technician (null → 'Unassigned')
  const byTech: Record<string, {
    name: string; total: number; completed: number; open: number;
    totalRevenue: number; resolutionTimes: number[]
  }> = {}

  for (const m of maint) {
    const name = m.assigned_to_name ?? 'Unassigned'
    if (!byTech[name]) byTech[name] = { name, total: 0, completed: 0, open: 0, totalRevenue: 0, resolutionTimes: [] }
    byTech[name].total++
    if (m.status === 'completed') {
      byTech[name].completed++
      if (m.completed_at && m.created_at) {
        const hours = (new Date(m.completed_at).getTime() - new Date(m.created_at).getTime()) / 3600000
        byTech[name].resolutionTimes.push(hours)
      }
    } else {
      byTech[name].open++
    }
    byTech[name].totalRevenue += m.charge_amount ?? 0
  }

  const techRows = Object.values(byTech)
    .map(t => ({
      ...t,
      completionRate: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
      avgResolutionHours: t.resolutionTimes.length > 0
        ? Math.round(t.resolutionTimes.reduce((s, v) => s + v, 0) / t.resolutionTimes.length)
        : null,
    }))
    .sort((a, b) => b.completed - a.completed)

  const totalJobs = maint.length
  const totalRevenue = maint.reduce((s, m) => s + (m.charge_amount ?? 0), 0)
  const totalCompleted = maint.filter(m => m.status === 'completed').length

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Technician Performance Report</h2>
          <p className="text-slate-500 text-sm mt-0.5">Jobs completed, resolution time, and revenue billed per technician</p>
        </div>
        <div className="flex items-center gap-2">
          <PropertySelectClient properties={properties} selectedId={propertyId} />
          <TechExcelButton techRows={techRows} currency={currency} totalJobs={totalJobs} totalRevenue={totalRevenue} totalCompleted={totalCompleted} />
          <PrintButton />
        </div>
      </div>
      <PrintHeader reportTitle="Technician Performance Report" orgName={orgName} userName={userName} printDate={printDate} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-slate-700">{totalJobs}</div>
          <div className="text-xs text-slate-500 mt-1">Total Jobs</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-emerald-700">{totalCompleted}</div>
          <div className="text-xs text-slate-500 mt-1">Jobs Completed</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-blue-700">{techRows.filter(t => t.name !== 'Unassigned').length}</div>
          <div className="text-xs text-slate-500 mt-1">Active Technicians</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-700"><OmrAmount value={totalRevenue} /></div>
          <div className="text-xs text-slate-500 mt-1">Total Revenue Billed</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <User size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Performance by Technician</h3>
        </div>
        {techRows.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">No maintenance jobs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Technician</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Total Jobs</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Completed</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Open</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Completion Rate</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Avg Resolution</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Revenue Billed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {techRows.map((t, i) => (
                  <tr key={t.name} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                    <td className="px-4 py-3 text-slate-600">{t.total}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-emerald-700"><CheckCircle size={12} /> {t.completed}</span>
                    </td>
                    <td className="px-4 py-3 text-amber-600">{t.open}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${t.completionRate >= 80 ? 'bg-emerald-500' : t.completionRate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${t.completionRate}%` }} />
                        </div>
                        <span className="text-xs text-slate-600">{t.completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.avgResolutionHours != null ? (
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {t.avgResolutionHours >= 24 ? `${Math.round(t.avgResolutionHours / 24)}d` : `${t.avgResolutionHours}h`}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-700">{t.totalRevenue > 0 ? <OmrAmount value={t.totalRevenue} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
