import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Wrench } from 'lucide-react'
import AddMaintenanceForm from './AddMaintenanceForm'
import MaintenanceFilters from './MaintenanceFilters'

export const metadata = { title: 'Maintenance' }

export default async function MaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single()
  const orgId = profile?.organization_id
  const canManage = profile?.role === 'owner' || profile?.role === 'property_manager'
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found</div>

  const admin = createAdminClient()
  const [reqRes, unitsRes, techRes] = await Promise.all([
    supabase
      .from('maintenance_requests')
      .select('*, units(unit_number, properties(name)), profiles(full_name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase.from('units').select('id, unit_number, properties(name)').eq('organization_id', orgId),
    admin.from('profiles').select('id, full_name').eq('organization_id', orgId).eq('role', 'technician'),
  ])

  const statusOrder: Record<string, number> = { open: 0, assigned: 1, in_progress: 2, completed: 3, canceled: 4 }
  const requests = (reqRes.data ?? []).sort((a, b) => {
    const sa = statusOrder[a.status] ?? 5
    const sb = statusOrder[b.status] ?? 5
    if (sa !== sb) return sa - sb
    // Completed: sort by completed_at desc; others by created_at desc
    const aDate = a.status === 'completed' ? (a.completed_at ?? a.created_at) : a.created_at
    const bDate = b.status === 'completed' ? (b.completed_at ?? b.created_at) : b.created_at
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })
  const units = unitsRes.data ?? []
  const technicians = (techRes.data ?? []) as { id: string; full_name: string }[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Maintenance</h2>
          <p className="text-slate-500 text-sm mt-0.5">{requests.length} requests</p>
        </div>
        {canManage && <AddMaintenanceForm orgId={orgId} units={units as never} technicians={technicians} />}
      </div>

      {requests.length === 0 ? (
        <div className="card p-16 text-center">
          <Wrench size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">No maintenance requests</h3>
          <p className="text-slate-400 text-sm">Maintenance requests from tenants will appear here.</p>
        </div>
      ) : (
        <MaintenanceFilters requests={requests} technicians={technicians} canManage={canManage} />
      )}
    </div>
  )
}
