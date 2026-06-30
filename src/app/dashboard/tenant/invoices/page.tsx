import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Receipt, CheckCircle, AlertCircle, Clock } from 'lucide-react'

export const metadata = { title: 'My Invoices' }

const statusIcon: Record<string, React.ElementType> = {
  paid: CheckCircle, overdue: AlertCircle, sent: Clock, draft: Clock,
}
const statusColor: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  sent: 'bg-blue-100 text-blue-700',
  draft: 'bg-slate-100 text-slate-600',
}

export default async function TenantInvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tenant } = await supabase.from('tenants').select('id').eq('profile_id', user.id).single()
  if (!tenant) return <div className="text-slate-400 text-center py-20">No tenant profile found.</div>

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('due_date', { ascending: false })

  const inv = invoices ?? []
  const totalDue = inv.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0)
  const totalPaid = inv.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-slate-900">My Invoices</h2>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Amount Due</div>
          <div className={`text-2xl font-bold mt-1 ${totalDue > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {totalDue.toLocaleString()} OMR
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Total Paid</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{totalPaid.toLocaleString()} OMR</div>
        </div>
      </div>

      {inv.length === 0 ? (
        <div className="card p-16 text-center">
          <Receipt size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">No invoices yet</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {inv.map(invoice => {
            const Icon = statusIcon[invoice.status] ?? Clock
            return (
              <div key={invoice.id} className="card p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${statusColor[invoice.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 capitalize">{invoice.type} Payment</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Due: {invoice.due_date}
                    {invoice.paid_date && <span className="ml-2 text-green-600">Paid: {invoice.paid_date}</span>}
                  </div>
                  {invoice.notes && <div className="text-xs text-slate-400 truncate mt-0.5">{invoice.notes}</div>}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-slate-900">{Number(invoice.amount).toLocaleString()} {invoice.currency}</div>
                  <span className={`badge text-xs mt-1 ${statusColor[invoice.status]}`}>{invoice.status}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
