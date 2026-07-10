import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, MapPin } from 'lucide-react'

export const metadata = { title: 'Schedule' }

const priorityColor: Record<string, string> = {
  urgent: 'border-l-red-500 bg-red-50',
  high: 'border-l-orange-500 bg-orange-50',
  medium: 'border-l-blue-400 bg-blue-50',
  low: 'border-l-slate-300 bg-slate-50',
}

export default async function TechnicianSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: orders } = await supabase
    .from('maintenance_requests')
    .select('*, units(unit_number, floor, properties(name, address, city))')
    .eq('technician_id', user.id)
    .in('status', ['open', 'assigned', 'in_progress'])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  const list = orders ?? []

  // Group by priority for display
  const urgent = list.filter(o => o.priority === 'urgent')
  const high = list.filter(o => o.priority === 'high')
  const medium = list.filter(o => o.priority === 'medium')
  const low = list.filter(o => o.priority === 'low')

  const groups = [
    { label: 'Urgent', items: urgent, dot: 'bg-red-500' },
    { label: 'High', items: high, dot: 'bg-orange-500' },
    { label: 'Medium', items: medium, dot: 'bg-blue-400' },
    { label: 'Low', items: low, dot: 'bg-slate-300' },
  ].filter(g => g.items.length > 0)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Schedule</h2>
        <p className="text-slate-500 text-sm mt-0.5">{list.length} active jobs · sorted by priority</p>
      </div>

      {list.length === 0 ? (
        <div className="card p-16 text-center">
          <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">Schedule is clear</h3>
          <p className="text-slate-400 text-sm mt-1">No active jobs assigned to you.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2.5 h-2.5 rounded-full ${group.dot}`} />
                <h3 className="font-semibold text-slate-700">{group.label} Priority</h3>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{group.items.length}</span>
              </div>
              <div className="space-y-3">
                {group.items.map(order => {
                  const unit = order.units as {
                    unit_number: string; floor: number | null;
                    properties: { name: string; address: string; city: string } | null
                  } | null
                  return (
                    <div key={order.id} className={`rounded-xl border-l-4 p-4 ${priorityColor[order.priority] ?? 'border-l-slate-300 bg-slate-50'}`}>
                      <div className="font-semibold text-slate-900">{order.title}</div>
                      <div className="text-sm text-slate-600 mt-1 capitalize">{order.category} · {order.status.replace('_', ' ')}</div>
                      <div className="flex items-start gap-1.5 mt-2 text-xs text-slate-500">
                        <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                        <span>
                          {unit?.properties?.name} — Unit {unit?.unit_number}
                          {unit?.floor ? `, Floor ${unit.floor}` : ''}
                          {unit?.properties?.address ? ` · ${unit.properties.address}${unit?.properties?.address_line2 ? `, ${unit.properties.address_line2}` : ''}` : ''}
                          {unit?.properties?.city ? `, ${unit.properties.city}` : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-2">
                        {order.description}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
