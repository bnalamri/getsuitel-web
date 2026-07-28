import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Wrench } from 'lucide-react'
import SubmitRequestForm from './SubmitRequestForm'
import MaintenanceList from './MaintenanceList'

export const metadata = { title: 'Maintenance' }

export default async function TenantMaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: tenant }, { data: profile }] = await Promise.all([
    supabase.from('tenants').select('id, organization_id').eq('profile_id', user.id).single(),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ])
  if (!tenant) return <div className="text-slate-400 text-center py-20">No tenant profile found.</div>
  const tenantName = profile?.full_name ?? 'Tenant'

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
            tenantName={tenantName}
          />
        )}
      </div>

      {reqs.length === 0 ? (
        <div className="card p-16 text-center">
          <Wrench size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">No requests yet</h3>
          <p className="text-slate-400 text-sm mt-1">Submit a maintenance request and we&apos;ll take care of it.</p>
        </div>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <MaintenanceList requests={reqs as any} />
      )}
    </div>
  )
}
