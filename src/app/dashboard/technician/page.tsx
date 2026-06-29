import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClipboardList, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

export const metadata = { title: 'Dashboard' }

const PRIORITY_COLOR: Record<string, string> = {
  low:'bg-slate-100 text-slate-600', medium:'bg-blue-100 text-blue-700',
  high:'bg-orange-100 text-orange-700', urgent:'bg-red-100 text-red-700',
}
const STATUS_COLOR: Record<string, string> = {
  open:'bg-yellow-100 text-yellow-700', assigned:'bg-blue-100 text-blue-700',
  in_progress:'bg-purple-100 text-purple-700', completed:'bg-green-100 text-green-700',
}

export default async function TechnicianDashboard() {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: orders } = await supabase
    .from('maintenance_requests')
    .select('*, units(unit_number, properties(name))')
    .eq('technician_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const all = orders ?? []
  const open = all.filter(o => o.status !== 'completed' && o.status !== 'canceled')
  const done = all.filter(o => o.status === 'completed').length
  const urgent = all.filter(o => o.priority === 'urgent' && o.status !== 'completed').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Work Orders</h2>
        <p className="text-slate-500 text-sm mt-1">Today's assignments</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Open Orders', value:open.length, icon:ClipboardList, color:'bg-blue-50 text-blue-700' },
          { label:'Completed', value:done, icon:CheckCircle2, color:'bg-green-50 text-green-700' },
          { label:'Urgent', value:urgent, icon:AlertCircle, color:'bg-red-50 text-red-700' },
        ].map(c => (
          <div key={c.label} className="card p-4 flex flex-col gap-2">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.color}`}><c.icon size={17}/></div>
            <div className="text-2xl font-bold text-slate-900">{c.value}</div>
            <div className="text-xs text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Active Work Orders</h3>
          <a href="/dashboard/technician/orders" className="text-xs text-navy-700 hover:underline">View all</a>
        </div>
        {open.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400"/>
            <p className="text-sm">All caught up! No open work orders.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {open.map((o: {
              id:string; title:string; priority:string; status:string; category:string;
              units?: { unit_number:string; properties?: { name:string } }
            }) => (
              <a key={o.id} href={`/dashboard/technician/orders/${o.id}`}
                className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-navy-200 hover:bg-slate-50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${o.priority==='urgent'?'bg-red-500':o.priority==='high'?'bg-orange-500':'bg-blue-400'}`}/>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 text-sm truncate">{o.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {o.units?.properties?.name} · Unit {o.units?.unit_number}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <span className={`badge ${PRIORITY_COLOR[o.priority] ?? ''}`}>{o.priority}</span>
                  <span className={`badge ${STATUS_COLOR[o.status] ?? ''}`}>{o.status.replace('_',' ')}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
