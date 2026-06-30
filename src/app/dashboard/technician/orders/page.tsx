import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import UpdateStatusButton from './UpdateStatusButton'

export const metadata = { title: 'Work Orders' }

const priorityColor: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700', low: 'bg-slate-100 text-slate-600',
}
const statusColor: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700', assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700', completed: 'bg-green-100 text-green-700',
  canceled: 'bg-slate-100 text-slate-400',
}
const nextStatus: Record<string, string> = {
  open: 'in_progress', assigned: 'in_progress', in_progress: 'completed',
}

export default async function WorkOrdersPage({ searchParams }: { searchParams: { filter?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const filter = searchParams.filter ?? 'active'

  let query = supabase
    .from('maintenance_requests')
    .select('*, units(unit_number, floor, properties(name, address))')
    .eq('technician_id', user.id)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  if (filter === 'active') query = query.in('status', ['open', 'assigned', 'in_progress'])
  else if (filter === 'completed') query = query.eq('status', 'completed')

  const { data: orders } = await query
  const list = orders ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Work Orders</h2>
        <p className="text-slate-500 text-sm mt-0.5">{list.length} orders</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'active', label: 'Active' },
          { key: 'completed', label: 'Completed' },
          { key: 'all', label: 'All' },
        ].map(f => (
          <a key={f.key} href={`?filter=${f.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.key ? 'bg-navy-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            {f.label}
          </a>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card p-16 text-center">
          <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">No work orders</h3>
          <p className="text-slate-400 text-sm mt-1">
            {filter === 'active' ? 'No active jobs assigned to you.' : 'Nothing to show here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(order => {
            const unit = order.units as { unit_number: string; floor: number | null; properties: { name: string; address: string } | null } | null
            const next = nextStatus[order.status]
            return (
              <div key={order.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`badge ${priorityColor[order.priority]}`}>{order.priority}</span>
                      <span className={`badge ${statusColor[order.status]}`}>{order.status.replace('_', ' ')}</span>
                      <span className="text-xs text-slate-400 capitalize">{order.category}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900">{order.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{order.description}</p>
                    <div className="mt-3 text-xs text-slate-400 space-y-0.5">
                      <div><span className="font-medium text-slate-600">{unit?.properties?.name}</span> · Unit {unit?.unit_number}{unit?.floor ? ` · Floor ${unit.floor}` : ''}</div>
                      {unit?.properties?.address && <div>{unit.properties.address}</div>}
                      <div>Reported: {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>
                  {next && (
                    <UpdateStatusButton
                      orderId={order.id}
                      nextStatus={next}
                      label={next === 'in_progress' ? 'Start Job' : 'Mark Complete'}
                      variant={next === 'completed' ? 'success' : 'primary'}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
