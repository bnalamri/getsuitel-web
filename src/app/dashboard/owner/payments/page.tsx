import { createClient } from '@/lib/supabase/server'
import { CreditCard, CheckCircle, Clock, Banknote, Smartphone, Building2, Receipt } from 'lucide-react'
import Link from 'next/link'
import ConfirmReceiptButton from './ConfirmReceiptButton'
import MarkPaidModal from '../invoices/MarkPaidModal'

export const metadata = { title: 'Payments' }

const methodIcon = {
  bank_transfer: Building2, mobile_transfer: Smartphone, cash: Banknote, cheque: Receipt,
} as Record<string, typeof CreditCard>

const methodLabel: Record<string, string> = {
  bank_transfer: 'Bank Transfer', mobile_transfer: 'Mobile Transfer',
  cash: 'Cash', cheque: 'Cheque',
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found</div>

  const [receiptsRes, invoicesRes] = await Promise.all([
    supabase.from('payment_receipts')
      .select('*, invoices(amount, currency, due_date, type), tenants(full_name)')
      .eq('organization_id', orgId)
      .order('submitted_at', { ascending: false }),
    supabase.from('invoices')
      .select('*, tenants(full_name), units(unit_number, properties(name))')
      .eq('organization_id', orgId)
      .in('status', ['sent', 'overdue'])
      .order('due_date', { ascending: true }),
  ])

  const receipts  = receiptsRes.data  ?? []
  const invoices  = invoicesRes.data  ?? []
  const pending   = receipts.filter(r => r.status === 'pending')
  const confirmed = receipts.filter(r => r.status === 'confirmed')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payments</h2>
          <p className="text-slate-500 text-sm mt-0.5">Review receipts and mark cash payments</p>
        </div>
        <Link href="/dashboard/owner/payments/cheques" className="btn-primary flex items-center gap-2 text-sm">
          <Receipt size={15}/> Cheque Tracker
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 border-l-4 border-amber-400">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pending Review</div>
          <div className="text-3xl font-bold text-amber-600 mt-1">{pending.length}</div>
        </div>
        <div className="card p-4 border-l-4 border-green-500">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Confirmed</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{confirmed.length}</div>
        </div>
        <div className="card p-4 border-l-4 border-slate-300">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Open Invoices</div>
          <div className="text-3xl font-bold text-slate-700 mt-1">{invoices.length}</div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Clock size={16} className="text-amber-500"/> Awaiting Confirmation
          {pending.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
          )}
        </h3>
        {pending.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-sm">No pending receipts</div>
        ) : (
          <div className="space-y-3">
            {pending.map(r => {
              const Icon = methodIcon[r.method] ?? CreditCard
              const inv  = r.invoices as { amount: number; currency: string; due_date: string; type: string } | null
              return (
                <div key={r.id} className="card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Icon size={18}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900">{(r.tenants as { full_name: string })?.full_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {methodLabel[r.method]} via {inv?.type} due {inv?.due_date}
                    </div>
                    {r.notes && <div className="text-xs text-slate-400 mt-0.5 truncate">{r.notes}</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-slate-900 mb-2">
                      {Number(inv?.amount ?? r.amount).toLocaleString()} {inv?.currency ?? 'OMR'}
                    </div>
                    <div className="flex gap-2 justify-end items-center">
                      {r.receipt_url && (
                        <a href={r.receipt_url} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-600 underline hover:text-blue-800">Receipt</a>
                      )}
                      <ConfirmReceiptButton receiptId={r.id} action="confirmed" />
                      <ConfirmReceiptButton receiptId={r.id} action="rejected" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Banknote size={16} className="text-emerald-600"/> Mark as Paid
        </h3>
        {invoices.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-sm">No open invoices</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Tenant</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Unit</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Amount</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Due</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map(inv => {
                  const unit = inv.units as { unit_number: string; properties: { name: string } } | null
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{(inv.tenants as { full_name: string })?.full_name}</td>
                      <td className="px-4 py-3 text-slate-500">{unit?.unit_number}</td>
                      <td className="px-4 py-3 font-bold">{Number(inv.amount).toLocaleString()} {inv.currency}</td>
                      <td className="px-4 py-3 text-slate-500">{inv.due_date}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MarkPaidModal invoiceId={inv.id} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmed.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500"/> Recent Confirmations
          </h3>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Tenant</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Method</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Amount</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {confirmed.slice(0, 10).map(r => {
                  const inv = r.invoices as { amount: number; currency: string } | null
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-medium">{(r.tenants as { full_name: string })?.full_name}</td>
                      <td className="px-4 py-3 text-slate-500">{methodLabel[r.method]}</td>
                      <td className="px-4 py-3 font-bold">{Number(inv?.amount ?? r.amount).toLocaleString()} {inv?.currency ?? 'OMR'}</td>
                      <td className="px-4 py-3 text-slate-500">{r.confirmed_at?.split('T')[0]}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
