import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClipboardList, CalendarDays, CheckCircle2 } from 'lucide-react'
import UpdateStatusButton from './UpdateStatusButton'
import SubmitChargeForm from './SubmitChargeForm'
import CompleteJobModal from './CompleteJobModal'

function fmtDate(iso: string) {
  const d = iso.substring(0, 10).split('-')
  return `${d[2]}/${d[1]}/${d[0]}`
}

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

const TABS = [
  { key: 'open',        label: 'Open',        match: (s: string) => s === 'open' || s === 'assigned' },
  { key: 'in_progress', label: 'In Progress',  match: (s: string) => s === 'in_progress' },
  { key: 'done',        label: 'Done',         match: (s: string) => s === 'completed' },
]

const emptyMsg: Record<string, string> = {
  open: 'No open jobs assigned to you.',
  in_progress: 'No jobs currently in progress.',
  done: 'No completed jobs yet.',
}

export default async function WorkOrdersPage({ searchParams }: { searchParams: { tab?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch all orders once — filter in memory for tab counts
  const { data: orders } = await supabase
    .from('maintenance_requests')
    .select('*, units(unit_number, floor, properties(name, address))')
    .eq('technician_id', user.id)
    .order('created_at', { ascending: false })

  // Sort: Done tab by completed_at desc; others by created_at desc (already ordered above)
  const sortedOrders = (orders ?? []).sort((a, b) => {
    const aIsDone = a.status === 'completed'
    const bIsDone = b.status === 'completed'
    if (aIsDone && bIsDone) {
      // Both done: sort by completed_at desc, fall back to created_at
      const ca = a.completed_at ?? a.created_at
      const cb = b.completed_at ?? b.created_at
      return new Date(cb).getTime() - new Date(ca).getTime()
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const all = sortedOrders
  const tab = searchParams.tab ?? 'open'
  const currentTab = TABS.find(t => t.key === tab) ?? TABS[0]
  const list = all.filter(o => currentTab.match(o.status))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Work Orders</h2>
        <p className="text-slate-500 text-sm mt-0.5">{all.length} total</p>
      </div>

      {/* Tabs with counts */}
      <div className="flex border-b border-slate-200">
        {TABS.map(t => {
          const count = all.filter(o => t.match(o.status)).length
          const active = tab === t.key
          return (
            <a key={t.key} href={`?tab=${t.key}`}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-orange-700 text-orange-800'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}>
              {t.label}
              <span className={`text-xs rounded-full px-2 py-0.5 font-semibold ${
                active ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
              }`}>{count}</span>
            </a>
          )
        })}
      </div>

      {list.length === 0 ? (
        <div className="card p-16 text-center">
          <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">No orders here</h3>
          <p className="text-slate-400 text-sm mt-1">{emptyMsg[tab]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(order => {
            const unit = order.units as { unit_number: string; floor: number | null; properties: { name: string; address: string } | null } | null
            const next = nextStatus[order.status]
            const isDone = order.status === 'completed'
            const chargePayer  = order.charge_payer  as string | null
            const chargeAmount = order.charge_amount as number | null
            const finalAmount  = order.final_amount  as number | null
            const invoicePaid  = (order.invoice_paid as boolean | null) ?? false

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
                    <div className="mt-3 text-xs text-slate-400 space-y-1">
                      <div>
                        <span className="font-medium text-slate-600">{unit?.properties?.name}</span>
                        {' · '}Unit {unit?.unit_number}
                        {unit?.floor ? ` · Floor ${unit.floor}` : ''}
                      </div>
                      <div>Reported: {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      {order.scheduled_date && (
                        <div className="flex items-center gap-1 text-blue-600 font-semibold">
                          <CalendarDays size={12} />
                          Scheduled: {fmtDate(order.scheduled_date as string)}
                        </div>
                      )}
                      {isDone && order.completed_at && (
                        <div className="flex items-center gap-1 text-green-600 font-semibold">
                          <CheckCircle2 size={12} />
                          Completed: {fmtDate(order.completed_at as string)}
                        </div>
                      )}
                    </div>
                  </div>
                  {next && next !== 'completed' && (
                    <UpdateStatusButton
                      orderId={order.id}
                      nextStatus={next}
                      label="Start Job"
                      variant="primary"
                    />
                  )}
                  {next === 'completed' && (
                    <CompleteJobModal
                      orderId={order.id}
                      orderTitle={order.title}
                      agreedAmount={chargeAmount}
                      agreedPayer={chargePayer}
                    />
                  )}
                </div>

                {/* Charge form — shown on Done tab for owner-billed jobs */}
                {isDone && chargePayer === 'owner' && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <SubmitChargeForm
                      orderId={order.id}
                      agreedAmount={chargeAmount}
                      finalAmount={finalAmount}
                      invoicePaid={invoicePaid}
                    />
                  </div>
                )}

                {/* Tenant-billed info on Done tab */}
                {isDone && chargePayer === 'tenant' && chargeAmount != null && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      OMR {parseFloat(String(chargeAmount)).toFixed(3)} — collected directly from tenant
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
