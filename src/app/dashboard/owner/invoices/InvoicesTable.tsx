'use client'
import { useState } from 'react'
import { Paperclip } from 'lucide-react'
import EditInvoiceForm from './EditInvoiceForm'
import MarkPaidModal from './MarkPaidModal'

const PAID_VIA_LABEL: Record<string, string> = {
  cash:            'Cash',
  cheque:          'Cheque',
  bank_transfer:   'Bank Transfer',
  mobile_transfer: 'Mobile Transfer',
}

type Invoice = {
  id: string; tenant_id: string; unit_id: string
  type: string; amount: number | string; currency: string
  due_date: string; paid_date?: string | null; status: string; notes?: string | null
  paid_via?: string | null
  payment_slip_url?: string | null
  tenants?: { full_name: string } | null
  units?: { unit_number: string; properties?: { name: string } | null } | null
}
type Tenant = { id: string; full_name: string; email: string; contracts: { unit_id: string; status: string }[] }
type Unit = { id: string; unit_number: string; properties?: { name: string } | null }

const statusColor: Record<string, string> = {
  draft:    'bg-slate-100 text-slate-600',
  sent:     'bg-blue-100 text-blue-700',
  paid:     'bg-green-100 text-green-700',
  overdue:  'bg-red-100 text-red-700',
  canceled: 'bg-slate-100 text-slate-400',
}

export default function InvoicesTable({
  invoices,
  tenants,
  units,
  canManage,
  properties = [],
}: {
  invoices: Invoice[]
  tenants: Tenant[]
  units: Unit[]
  canManage: boolean
  properties?: { id: string; name: string }[]
}) {
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterProperty, setFilterProperty] = useState('')

  const filtered = invoices
    .filter(i => !filterStatus   || i.status === filterStatus)
    .filter(i => !filterProperty || (i.units as Invoice['units'])?.properties?.name === filterProperty)

  return (
    <div className="space-y-3">
      {/* Filter row */}
      <div className="flex items-center gap-3 justify-end flex-wrap">
        {properties.length > 1 && (
          <select className="input text-sm w-44" value={filterProperty} onChange={e => setFilterProperty(e.target.value)}>
            <option value="">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        )}
        <select className="input text-sm w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">No invoices match the selected filter.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Tenant</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Unit</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Type</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Amount</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Due Date</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Paid Date</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(inv => {
                const tenant = inv.tenants
                const unit = inv.units
                const tenantRecord = tenants.find(t => t.id === inv.tenant_id)
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{tenant?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      <div>{unit?.properties?.name}</div>
                      <div className="text-slate-400">Unit {unit?.unit_number}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{inv.type}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{Number(inv.amount).toLocaleString()} {inv.currency}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.due_date}</td>
                    <td className="px-4 py-3">
                      {inv.paid_date
                        ? <span className="text-emerald-700 font-medium">{inv.paid_date}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusColor[inv.status]}`}>{inv.status}</span>
                      {inv.status === 'paid' && inv.paid_via && (
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          {PAID_VIA_LABEL[inv.paid_via] ?? inv.paid_via}
                          {inv.payment_slip_url && (
                            <a href={inv.payment_slip_url} target="_blank" rel="noopener noreferrer"
                              title="View payment slip"
                              className="text-blue-500 hover:text-blue-700 ml-0.5">
                              <Paperclip size={11} />
                            </a>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <EditInvoiceForm
                            invoice={{ id: inv.id, tenant_id: inv.tenant_id, unit_id: inv.unit_id, type: inv.type, amount: Number(inv.amount), currency: inv.currency, due_date: inv.due_date, paid_date: inv.paid_date ?? null, status: inv.status, notes: inv.notes }}
                            tenants={tenants}
                            units={units as never}
                          />
                          {['sent', 'overdue', 'draft'].includes(inv.status) && (
                            <MarkPaidModal
                              invoiceId={inv.id}
                              tenantEmail={tenantRecord?.email ?? null}
                              tenantName={tenant?.full_name ?? tenantRecord?.full_name ?? null}
                              amount={Number(inv.amount)}
                              currency={inv.currency}
                              invoiceType={inv.type}
                              dueDate={inv.due_date}
                            />
                          )}
                        </div>
                      )}
                    </td>
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
