import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Wrench } from 'lucide-react'
import SubmitRequestForm from './SubmitRequestForm'

export const metadata = { title: 'Maintenance' }

const priorityColor: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700', low: 'bg-slate-100 text-slate-600',
}
const statusColor: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700', assigned: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700', completed: 'bg-green-100 text-green-700',
  canceled: 'bg-slate-100 text-slate-400',
}

export default async function TenantMaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tenant } = await supabase.from('tenants').select('id, organization_id').eq('profile_id', user.id).single()
  if (!tenant) return <div className="text-slate-400 text-center py-20">No tenant profile found.</div>

  // Get tenant's active unit
  const { data: contract } = await supabase
    .from('contracts').select('unit_id, units(unit_number)').eq('tenant_id', tenant.id).eq('status', 'active').single()

  const { data: requests } = await supabase
    .from('maintenance_requests')
    .select('*, profiles(full_name)')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  const reqs = requests ?? []

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Maintenance</h2>
          <p className="text-slate-500 text-sm mt-0.5">{reqs.length} requests</p>
        </div>
        {contract && (
          <SubmitRequestForm
            tenantId={tenant.id}
            orgId={tenant.organization_id}
            unitId={contract.unit_id}
            unitNumber={(contract.units as { unit_number: string } | null)?.unit_number ?? ''}
          />
        )}
      </div>

      {reqs.length === 0 ? (
        <div className="card p-16 text-center">
          <Wrench size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">No requests yet</h3>
          <p className="text-slate-400 text-sm mt-1">Submit a maintenance request and we'll take care of it.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reqs.map(r => {
            const tech = r.profiles as { full_name: string } | null
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{r.title}</div>
                    <div className="text-sm text-slate-500 mt-0.5 capitalize">{r.category}</div>
                    <div className="text-xs text-slate-400 mt-1">{r.description}</div>
                    {tech && <div className="text-xs text-slate-500 mt-2">Assigned to: <span className="font-medium">{tech.full_name}</span></div>}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`badge ${priorityColor[r.priority]}`}>{r.priority}</span>
                    <span className={`badge ${statusColor[r.status]}`}>{r.status.replace('_',' ')}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-3">
                  {new Date(r.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
