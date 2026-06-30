import { createClient } from '@/lib/supabase/server'
import { FileText, Calendar } from 'lucide-react'
import AddContractForm from './AddContractForm'

export const metadata = { title: 'Contracts' }

const statusColor: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  terminated: 'bg-orange-100 text-orange-700',
}

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found</div>

  const [contractsRes, unitsRes, tenantsRes] = await Promise.all([
    supabase.from('contracts').select('*, units(unit_number, properties(name)), tenants(full_name)').eq('organization_id', orgId).order('created_at', { ascending: false }),
    supabase.from('units').select('id, unit_number, properties(name)').eq('organization_id', orgId).eq('status', 'vacant'),
    supabase.from('tenants').select('id, full_name').eq('organization_id', orgId),
  ])

  const contracts = contractsRes.data ?? []
  const vacantUnits = unitsRes.data ?? []
  const tenants = tenantsRes.data ?? []

  const daysLeft = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contracts</h2>
          <p className="text-slate-500 text-sm mt-0.5">{contracts.length} contracts</p>
        </div>
        <AddContractForm orgId={orgId} units={vacantUnits as never} tenants={tenants} />
      </div>

      {contracts.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">No contracts yet</h3>
          <p className="text-slate-400 text-sm">Create a contract to link a tenant to a unit.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Tenant</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Unit</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Period</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Rent</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.map(c => {
                const tenant = c.tenants as { full_name: string } | null
                const unit = c.units as { unit_number: string; properties: { name: string } | null } | null
                const days = daysLeft(c.end_date)
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{tenant?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{unit?.properties?.name}</div>
                      <div className="text-xs text-slate-400">Unit {unit?.unit_number}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1 text-xs"><Calendar size={11} />{c.start_date} → {c.end_date}</div>
                      {c.status === 'active' && days <= 60 && days > 0 && (
                        <div className="text-xs text-orange-600 mt-0.5">Expires in {days} days</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{Number(c.rent_amount).toLocaleString()} {c.currency}</td>
                    <td className="px-4 py-3"><span className={`badge ${statusColor[c.status]}`}>{c.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
