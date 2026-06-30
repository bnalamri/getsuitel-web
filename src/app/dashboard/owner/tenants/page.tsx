import { createClient } from '@/lib/supabase/server'
import { Users, Phone, Mail } from 'lucide-react'
import AddTenantForm from './AddTenantForm'

export const metadata = { title: 'Tenants' }

export default async function TenantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found</div>

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*, contracts(id, status, unit_id, units(unit_number, properties(name)))')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tenants</h2>
          <p className="text-slate-500 text-sm mt-0.5">{tenants?.length ?? 0} tenants</p>
        </div>
        <AddTenantForm orgId={orgId} />
      </div>

      {tenants?.length === 0 ? (
        <div className="card p-16 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">No tenants yet</h3>
          <p className="text-slate-400 text-sm">Add tenants to assign them to units and create contracts.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Name</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Contact</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Unit</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Contract</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants?.map(t => {
                const contracts = t.contracts as { id: string; status: string; units: { unit_number: string; properties: { name: string } | null } | null }[]
                const active = contracts?.find(c => c.status === 'active')
                const unit = active?.units
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{t.full_name}</div>
                      {t.nationality && <div className="text-xs text-slate-400">{t.nationality}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-slate-600"><Mail size={12} />{t.email}</div>
                      <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5"><Phone size={11} />{t.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {unit ? <><div>{unit.properties?.name}</div><div className="text-xs text-slate-400">Unit {unit.unit_number}</div></> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {active ? (
                        <span className="badge bg-green-100 text-green-700">Active</span>
                      ) : contracts?.length > 0 ? (
                        <span className="badge bg-slate-100 text-slate-600 capitalize">{contracts[0].status}</span>
                      ) : (
                        <span className="text-slate-400 text-xs">No contract</span>
                      )}
                    </td>
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
