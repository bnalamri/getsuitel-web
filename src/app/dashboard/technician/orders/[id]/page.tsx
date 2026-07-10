import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft, MapPin, Tag, Calendar, AlertCircle } from 'lucide-react'
import UpdateStatusButton from '../UpdateStatusButton'
import SubmitChargeForm from '../SubmitChargeForm'

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

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: order } = await supabase
    .from('maintenance_requests')
    .select('*, units(unit_number, floor, properties(name, address))')
    .eq('id', params.id)
    .eq('technician_id', user.id)
    .single()

  if (!order) notFound()

  const unit = order.units as { unit_number: string; floor: number | null; properties: { name: string; address: string } | null } | null
  const next = nextStatus[order.status]

  const chargePayer = order.charge_payer as string | null
  const chargeAmount = order.charge_amount as number | null
  const finalAmount = order.final_amount as number | null
  const invoicePaid = (order.invoice_paid as boolean | null) ?? false

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <a href="/dashboard/technician/orders" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft size={20} />
        </a>
        <h2 className="text-2xl font-bold text-slate-900">Work Order</h2>
      </div>

      {/* Status + priority */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`badge ${priorityColor[order.priority]}`}>{order.priority}</span>
        <span className={`badge ${statusColor[order.status]}`}>{order.status.replace('_', ' ')}</span>
        <span className="text-xs text-slate-400 capitalize">{order.category}</span>
      </div>

      {/* Main card */}
      <div className="card p-5 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{order.title}</h3>
          <p className="text-slate-600 mt-2 text-sm leading-relaxed">{order.description}</p>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-slate-700">{unit?.properties?.name}</span>
              <span className="text-slate-500"> · Unit {unit?.unit_number}</span>
              {unit?.floor && <span className="text-slate-500"> · Floor {unit.floor}</span>}
              {unit?.properties?.address && (
                <div className="text-slate-400 mt-0.5">{unit.properties.address}{unit?.properties?.address_line2 ? `, ${unit.properties.address_line2}` : ''}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Tag size={15} className="text-slate-400 flex-shrink-0" />
            <span className="text-slate-500 capitalize">{order.category}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <AlertCircle size={15} className="text-slate-400 flex-shrink-0" />
            <span className="text-slate-500 capitalize">Priority: <span className="font-medium text-slate-700">{order.priority}</span></span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar size={15} className="text-slate-400 flex-shrink-0" />
            <span className="text-slate-500">
              Reported: {new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Action — Start / Complete */}
      {next && (
        <div className="card p-5">
          <p className="text-sm text-slate-500 mb-3">
            {next === 'in_progress' ? 'Ready to start? Click below to begin working on this job.' : 'Job finished? Mark it as complete.'}
          </p>
          <UpdateStatusButton
            orderId={order.id}
            nextStatus={next}
            label={next === 'in_progress' ? 'Start Job' : 'Mark Complete'}
            variant={next === 'completed' ? 'success' : 'primary'}
          />
        </div>
      )}

      {/* Completed confirmation */}
      {order.status === 'completed' && (
        <div className="card p-5 text-center text-green-600 font-medium">
          ✓ This job has been completed.
        </div>
      )}

      {/* Service charge — owner pays: invoice submission form */}
      {order.status === 'completed' && chargePayer === 'owner' && (
        <SubmitChargeForm
          orderId={order.id}
          agreedAmount={chargeAmount}
          finalAmount={finalAmount}
          invoicePaid={invoicePaid}
        />
      )}

      {/* Service charge — tenant pays: info only */}
      {order.status === 'completed' && chargePayer === 'tenant' && (
        <div className="card p-5 bg-amber-50 border border-amber-200">
          <div className="text-sm font-semibold text-amber-800 mb-1">Payment — Tenant</div>
          <div className="text-sm text-amber-700">
            {chargeAmount != null
              ? `OMR ${parseFloat(String(chargeAmount)).toFixed(3)} — agreed and collected directly from tenant.`
              : 'Fees to be agreed and collected directly from tenant.'
            }
          </div>
        </div>
      )}
    </div>
  )
}
