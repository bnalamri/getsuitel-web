'use client'

import { useState } from 'react'
import { Receipt, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import OmrAmount from '@/components/OmrAmount'
import PaymentPanel from './PaymentPanel'

const statusIcon = {
  paid: CheckCircle, overdue: AlertCircle, sent: Clock, draft: Clock,
} as Record<string, typeof Clock>

const statusColor: Record<string, string> = {
  paid:    'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  sent:    'bg-blue-100 text-blue-700',
  draft:   'bg-slate-100 text-slate-600',
}

const STATUS_LABELS: Record<string, string> = {
  all:      'All Status',
  sent:     'Unpaid',
  overdue:  'Overdue',
  paid:     'Paid',
  draft:    'Draft',
  canceled: 'Canceled',
}

type Invoice = {
  id: string
  type: string
  amount: number | string
  currency: string
  status: string
  due_date: string | null
  paid_date: string | null
  payment_method: string | null
  notes: string | null
}

type Org = {
  bank_account_name: string | null
  bank_account_number: string | null
  bank_name: string | null
  bank_iban: string | null
  mobile_wallet_number: string | null
  mobile_wallet_label: string | null
} | null

export default function InvoiceList({
  invoices, tenantId, orgId, org,
}: {
  invoices: Invoice[]
  tenantId: string
  orgId: string | null
  org: Org
}) {
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = statusFilter === 'all'
    ? invoices
    : invoices.filter(i => i.status === statusFilter)

  if (invoices.length === 0) {
    return (
      <div className="card p-16 text-center">
        <Receipt size={40} className="mx-auto text-slate-300 mb-3" />
        <h3 className="font-semibold text-slate-700">No invoices yet</h3>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filter row */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
        >
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <span className="text-sm text-slate-400">
          {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">
          No invoices match the selected filter.
        </div>
      ) : (
        filtered.map(invoice => {
          const Icon = statusIcon[invoice.status] ?? Clock
          const isOpen = ['sent', 'overdue'].includes(invoice.status)
          return (
            <div key={invoice.id} className="card overflow-x-auto">
              <div className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${statusColor[invoice.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 capitalize">{invoice.type} Payment</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Due: {invoice.due_date}
                    {invoice.paid_date && <span className="ml-2 text-green-600">Paid: {invoice.paid_date}</span>}
                    {invoice.payment_method && (
                      <span className="ml-2 capitalize text-slate-400">via {invoice.payment_method.replace(/_/g, ' ')}</span>
                    )}
                  </div>
                  {invoice.notes && (
                    <div className="text-xs text-slate-400 truncate mt-0.5">{invoice.notes}</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-slate-900"><OmrAmount value={Number(invoice.amount)} /></div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[invoice.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
              {isOpen && (
                <PaymentPanel
                  invoiceId={invoice.id}
                  tenantId={tenantId}
                  orgId={orgId}
                  amount={invoice.amount}
                  currency={invoice.currency}
                  org={org}
                />
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
