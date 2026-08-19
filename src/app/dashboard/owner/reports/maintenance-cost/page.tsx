import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Wrench, Building2, User } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'
import PropertySelectClient from '@/components/PropertySelectClient'
import MaintenanceCostExcelButton from './ExcelExportButton'
import OmrAmount from '@/components/OmrAmount'

export const metadata = { title: 'Maintenance Cost Analysis' }
export const dynamic = 'force-dynamic'

function fmtAmt(n: number, currency = 'OMR') {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}

export default async function MaintenanceCostPage({ searchParams }: { searchParams: Promise<{ property_id?: string }> }) {
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
      .select('id, category, charge_amount, charge_payer, status, completed_at, assigned_to_name, unit_id, units(unit_number, properties(id, name))')
      .eq('organization_id', orgId)
      .not('charge_amount', 'is', null),
    admin.from('organizations').select('name, default_currency').eq('id', orgId).single(),
    admin.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
  ])

  const currency = (orgRes.data?.default_currency as string) ?? 'OMR'
  const orgName = (orgRes.data?.name as string) ?? ''
  const properties = (propertiesRes.data ?? []) as { id: string; name: string }[]

  type MaintRow = {
    id: string; category: string; charge_amount: number; charge_payer: string;
    status: string; completed_at: string; assigned_to_name: string;
    units: { unit_number: string; properties: { id: string; name: string } | null } | null;
  }
  const allMaint = (maintRes.data ?? []) as MaintRow[]
  const maint = propertyId
    ? allMaint.filter(m => (m.units as any)?.properties?.id === propertyId)
    : allMaint

  const total = maint.reduce((s, m) => s + (m.charge_amount ?? 0), 0)

  const byProp: Record<string, { name: string; total: number; count: number }> = {}
  for (const m of maint) {
    const prop = (m.units as any)?.properties
    const key = prop?.id ?? 'unknown'
    const name = prop?.name ?? 'Unknown'
    if (!byProp[key]) byProp[key] = { name, total: 0, count: 0 }
    byProp[key].total += m.charge_amount ?? 0
    byProp[key].count++
  }
  const propRows = Object.values(byProp).sort((a, b) => b.total - a.total)

  const byCat: Record<string, { total: number; count: number }> = {}
  for (const m of maint) {
    const cat = m.category ?? 'Other'
    if (!byCat[cat]) byCat[cat] = { total: 0, count: 0 }
    byCat[cat].total += m.charge_amount ?? 0
    byCat[cat].count++
  }
  const catRows = Object.entries(byCat).map(([cat, v]) => ({ cat, ...v })).sort((a, b) => b.total - a.total)

  const byTech: Record<string, { total: number; count: number }> = {}
  for (const m of maint) {
    const tech = m.assigned_to_name ?? 'Unassigned'
    if (!byTech[tech]) byTech[tech] = { total: 0, count: 0 }
    byTech[tech].total += m.charge_amount ?? 0
    byTech[tech].count++
  }
  const techRows = Object.entries(byTech).map(([tech, v]) => ({ tech, ...v })).sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Maintenance Cost Analysis</h2>
          <p className="text-slate-500 text-sm mt-0.5">Spending breakdown by property, category and technician</p>
        </div>
        <div className="flex items-center gap-2">
          <PropertySelectClient properties={properties} selectedId={propertyId} />
          <MaintenanceCostExcelButton propRows={propRows} catRows={catRows} techRows={techRows} total={total} currency={currency} />
          <PrintButton />
        </div>
      </div>
      <PrintHeader reportTitle="Maintenance Cost Analysis" orgName={orgName} userName={userName} printDate={printDate} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-red-700"><OmrAmount value={total} /></div>
          <div className="text-xs text-slate-500 mt-1">Total Maintenance Spend</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-slate-700">{maint.length}</div>
          <div className="text-xs text-slate-500 mt-1">Jobs with Charges</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-amber-700">
            {maint.length ? <OmrAmount value={total / maint.length} /> : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Avg Cost per Job</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4"><Building2 size={15} className="text-slate-500" /><h3 className="text-sm font-semibold text-slate-800">By Property</h3></div>
          <div className="space-y-3">
            {propRows.map(p => (
              <div key={p.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{p.name}</span>
                  <span className="text-red-600 font-semibold"><OmrAmount value={p.total} /></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-red-400 h-2 rounded-full" style={{ width: `${Math.min(100, (p.total / total) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{p.count} jobs</span>
                </div>
              </div>
            ))}
            {propRows.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4"><Wrench size={15} className="text-slate-500" /><h3 className="text-sm font-semibold text-slate-800">By Category</h3></div>
          <div className="space-y-3">
            {catRows.map(c => (
              <div key={c.cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium capitalize">{c.cat}</span>
                  <span className="text-red-600 font-semibold"><OmrAmount value={c.total} /></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${Math.min(100, (c.total / total) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{c.count} jobs</span>
                </div>
              </div>
            ))}
            {catRows.length === 0 && <p className="text-sm text-slate-400">No data yet.</p>}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4"><User size={15} className="text-slate-500" /><h3 className="text-sm font-semibold text-slate-800">By Technician</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Technician</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Jobs</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Total Charged</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Avg per Job</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {techRows.map((t, i) => (
                <tr key={t.tech} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                  <td className="px-4 py-3 font-medium text-slate-800">{t.tech}</td>
                  <td className="px-4 py-3 text-slate-600">{t.count}</td>
                  <td className="px-4 py-3 font-semibold text-red-600"><OmrAmount value={t.total} /></td>
                  <td className="px-4 py-3 text-slate-600"><OmrAmount value={t.total / t.count} /></td>
                </tr>
              ))}
              {techRows.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
