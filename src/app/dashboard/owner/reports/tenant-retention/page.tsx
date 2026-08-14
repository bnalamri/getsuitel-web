import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Users, TrendingUp, TrendingDown } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'

export const metadata = { title: 'Tenant Retention Report' }
export const dynamic = 'force-dynamic'

export default async function TenantRetentionPage() {
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

  const [contractsRes, propertiesRes, orgRes] = await Promise.all([
    admin.from('contracts')
      .select('id, status, end_date, tenant_id, unit_id, units(property_id, unit_number, properties(id, name)), tenants(full_name, email)')
      .eq('organization_id', orgId)
      .order('end_date', { ascending: false }),
    admin.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
    admin.from('organizations').select('name').eq('id', orgId).single(),
  ])

  const orgName = (orgRes.data?.name as string) ?? ''

  type Contract = {
    id: string; status: string; end_date: string; tenant_id: string;
    units: { property_id: string; unit_number: string; properties: { id: string; name: string } | null } | null;
    tenants: { full_name: string; email: string } | null;
  }
  const contracts = (contractsRes.data ?? []) as Contract[]
  const properties = (propertiesRes.data ?? []) as { id: string; name: string }[]

  // Find tenants with expired contracts
  const expiredContracts = contracts.filter(c => c.status === 'expired' || (c.status === 'active' && new Date(c.end_date) < today))
  const activeContracts = contracts.filter(c => c.status === 'active')

  // Tenants who have both expired AND active contracts = renewed
  const expiredTenantIds = new Set(expiredContracts.map(c => c.tenant_id))
  const activeTenantIds = new Set(activeContracts.map(c => c.tenant_id))

  const renewedCount = [...expiredTenantIds].filter(id => activeTenantIds.has(id)).length
  const vacatedCount = [...expiredTenantIds].filter(id => !activeTenantIds.has(id)).length
  const retentionRate = expiredTenantIds.size > 0 ? Math.round((renewedCount / expiredTenantIds.size) * 100) : 0

  // By property
  const propRetention = properties.map(prop => {
    const propExp = expiredContracts.filter(c => c.units?.property_id === prop.id)
    const propActive = activeContracts.filter(c => c.units?.property_id === prop.id)
    const expIds = new Set(propExp.map(c => c.tenant_id))
    const actIds = new Set(propActive.map(c => c.tenant_id))
    const renewed = [...expIds].filter(id => actIds.has(id)).length
    const vacated = [...expIds].filter(id => !actIds.has(id)).length
    const rate = expIds.size > 0 ? Math.round((renewed / expIds.size) * 100) : null
    return { ...prop, expiredLeases: expIds.size, renewed, vacated, rate }
  }).filter(p => p.expiredLeases > 0)

  // Vacated tenants list
  const vacatedTenants = expiredContracts
    .filter(c => !activeTenantIds.has(c.tenant_id))
    .filter((c, i, arr) => arr.findIndex(x => x.tenant_id === c.tenant_id) === i) // dedupe
    .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tenant Retention Report</h2>
          <p className="text-slate-500 text-sm mt-0.5">Percentage of tenants who renewed vs vacated per property</p>
        </div>
        <PrintButton />
      </div>
      <PrintHeader reportTitle="Tenant Retention Report" orgName={orgName} userName={userName} printDate={printDate} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Expired Leases',    value: expiredTenantIds.size.toString(), color: 'text-slate-700' },
          { label: 'Renewed',           value: renewedCount.toString(),           color: 'text-emerald-700' },
          { label: 'Vacated',           value: vacatedCount.toString(),           color: 'text-red-600' },
          { label: 'Retention Rate',    value: `${retentionRate}%`,               color: retentionRate >= 70 ? 'text-emerald-700' : retentionRate >= 50 ? 'text-amber-600' : 'text-red-700' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Visual retention gauge */}
      {expiredTenantIds.size > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Portfolio Retention Rate</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
              <div className={`h-4 rounded-full transition-all ${retentionRate >= 70 ? 'bg-emerald-500' : retentionRate >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                style={{ width: `${retentionRate}%` }} />
            </div>
            <span className={`text-2xl font-bold ${retentionRate >= 70 ? 'text-emerald-700' : retentionRate >= 50 ? 'text-amber-600' : 'text-red-700'}`}>{retentionRate}%</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0% — Poor</span><span>70% — Good</span><span>100% — Excellent</span>
          </div>
        </div>
      )}

      {/* By property */}
      {propRetention.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users size={15} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Retention by Property</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Property</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Expired Leases</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Renewed</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Vacated</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Retention Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {propRetention.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.expiredLeases}</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">{p.renewed}</td>
                    <td className="px-4 py-3 text-red-600">{p.vacated}</td>
                    <td className="px-4 py-3">
                      {p.rate != null ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.rate >= 70 ? 'bg-emerald-100 text-emerald-700' : p.rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {p.rate}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vacated tenants list */}
      {vacatedTenants.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingDown size={15} className="text-red-500" />
            <h3 className="text-sm font-semibold text-slate-800">Vacated Tenants</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Tenant</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Unit</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Property</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Lease Ended</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vacatedTenants.map((t, i) => (
                  <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{t.tenants?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.units?.unit_number ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.units?.properties?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(t.end_date).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expiredTenantIds.size === 0 && (
        <div className="card px-5 py-12 text-center">
          <TrendingUp size={32} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No expired leases yet — all tenants are still active.</p>
        </div>
      )}
    </div>
  )
}
