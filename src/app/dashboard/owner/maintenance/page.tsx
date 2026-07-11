import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Wrench } from 'lucide-react'
import AddMaintenanceForm from './AddMaintenanceForm'
import AssignTechnicianForm from './AssignTechnicianForm'
import MarkPaidButton from './MarkPaidButton'

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

  const requests = reqRes.data ?? []
  const units = unitsRes.data ?? []
  const technicians = techRes.data ?? []

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
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Title</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Unit · Category</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Priority</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Assign Technician</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Service Charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map(r => {
                const unit = r.units as { unit_number: string; properties: { name: string } | null } | null
                const techProfile = r.profiles as { full_name: string } | null
                const chargePayer = r.charge_payer as string | null
                const chargeAmount = r.charge_amount as number | null
                const finalAmount = r.final_amount as number | null
                const invoicePaid = r.invoice_paid as boolean | null

                // Charge cell content
                let chargeCell: React.ReactNode = <span className="text-slate-300">—</span>
                if (chargePayer === 'tenant') {
                  chargeCell = (
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-amber-700">Tenant pays directly</div>
                      {chargeAmount != null && (
                        <div className="text-xs text-slate-400">Est. OMR {parseFloat(String(chargeAmount)).toFixed(3)}</div>
                      )}
                    </div>
                  )
                } else if (chargePayer === 'owner') {
                  if (invoicePaid) {
                    chargeCell = (
                      <div className="space-y-0.5">
                        <div className="text-xs font-medium text-green-700">✓ Paid</div>
                        {finalAmount != null && (
                          <div className="text-xs text-slate-500">OMR {parseFloat(String(finalAmount)).toFixed(3)}</div>
                        )}
                      </div>
                    )
                  } else if (finalAmount != null) {
                    chargeCell = (
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-slate-700">
                          OMR {parseFloat(String(finalAmount)).toFixed(3)}
                        </div>
                        <div className="text-xs text-blue-600">Invoice received</div>
                        <MarkPaidButton requestId={r.id} />
                      </div>
                    )
                  } else {
                    chargeCell = (
                      <div className="space-y-0.5">
                        <div className="text-xs font-medium text-slate-700">Owner pays</div>
                        {chargeAmount != null && (
                          <div className="text-xs text-slate-400">Est. OMR {parseFloat(String(chargeAmount)).toFixed(3)}</div>
                        )}
                        <div className="text-xs text-slate-400">Awaiting invoice</div>
                      </div>
                    )
                  }
                }

                return (
                  <tr key={r.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.title}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[180px]">{r.description}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="text-slate-600">{unit?.properties?.name}</div>
                      <div className="text-slate-400">Unit {unit?.unit_number}</div>
                      <div className="text-slate-400 capitalize mt-0.5">{r.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${priorityColor[r.priority]}`}>{r.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'completed' || r.status === 'canceled' ? (
                        <div className="text-xs text-slate-500">
                          {techProfile
                            ? <span className="font-medium text-slate-700">{techProfile.full_name}</span>
                            : <span className="text-slate-300">—</span>
                          }
                        </div>
                      ) : canManage ? (
                        <AssignTechnicianForm
                          requestId={r.id}
                          currentTechId={r.technician_id ?? null}
                          technicians={technicians}
                          currentChargePayer={chargePayer}
                          currentChargeAmount={chargeAmount}
                        />
                      ) : (
                        <span className="text-xs text-slate-400">{r.technician_id ? techProfile?.full_name ?? '—' : '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className={`badge ${statusColor[r.status]}`}>{r.status.replace('_', ' ')}</span>
                        {r.status === 'completed' && techProfile && (
                          <div className="text-xs text-slate-400">
                            by <span className="font-medium text-slate-600">{techProfile.full_name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{chargeCell}</td>
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
