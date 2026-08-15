'use client'
import { useState } from 'react'
import {
  CreditCard, CheckCircle, Clock, Banknote,
  Smartphone, Building2, Receipt, ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import OmrAmount from '@/components/OmrAmount'
import ConfirmReceiptButton from './ConfirmReceiptButton'
import MarkPaidModal from '../invoices/MarkPaidModal'

const methodIcon: Record<string, React.ElementType> = {
  bank_transfer: Building2, mobile_transfer: Smartphone, cash: Banknote, cheque: Receipt,
}
const methodLabel: Record<string, string> = {
  bank_transfer: 'Bank Transfer', mobile_transfer: 'Mobile Transfer',
  cash: 'Cash', cheque: 'Cheque',
}

type Property = { id: string; name: string }
type Row = Record<string, unknown>

export default function PaymentsClient({
  pending, confirmed, invoices, recentPaid, properties,
}: {
  pending: Row[]
  confirmed: Row[]
  invoices: Row[]
  recentPaid: Row[]
  properties: Property[]
}) {
  const [propId, setPropId] = useState('')

  const filteredInvoices = propId
    ? invoices.filter(inv => (inv.units as { property_id?: string } | null)?.property_id === propId)
    : invoices

  const filteredRecent = propId
    ? recentPaid.filter(inv => (inv.units as { property_id?: string } | null)?.property_id === propId)
    : recentPaid

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payments</h2>
          <p className="text-slate-500 text-sm mt-0.5">Review receipts and mark cash payments</p>
        </div>
        <Link href="/dashboard/owner/payments/cheques" className="btn-primary flex items-center gap-2 text-sm">
          <Receipt size={15}/> Cheque Tracker
        </Link>
      </div>

      {/* Stats */}
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
          <div className="text-3xl font-bold text-slate-700 mt-1">{filteredInvoices.length}</div>
        </div>
      </div>

      {/* Property filter — only when org has multiple properties */}
      {properties.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Property:</span>
          <div className="relative">
            <select
              value={propId}
              onChange={e => setPropId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-700"
            >
              <option value="">All Properties</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
          </div>
        </div>
      )}

      {/* Awaiting Confirmation — not filtered (receipts lack property info) */}
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
              const rid         = r.id as string
              const Icon        = methodIcon[r.method as string] ?? CreditCard
              const inv         = r.invoices as { amount: number; currency: string; due_date: string; type: string } | null
              const notes       = r.notes as string | undefined
              const receipt_url = r.receipt_url as string | undefined
              return (
                <div key={rid} className="card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Icon size={18}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900">{(r.tenants as { full_name: string })?.full_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {methodLabel[r.method as string]} via {inv?.type} due {inv?.due_date}
                    </div>
                    {notes && <div className="text-xs text-slate-400 mt-0.5 truncate">{notes}</div>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-slate-900 mb-2">
                      <OmrAmount value={Number(inv?.amount ?? r.amount)} />
                    </div>
                    <div className="flex gap-2 justify-end items-center">
                      {receipt_url && (
                        <a href={receipt_url} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-600 underline hover:text-blue-800">Receipt</a>
                      )}
                      <ConfirmReceiptButton receiptId={rid} action="confirmed" />
                      <ConfirmReceiptButton receiptId={rid} action="rejected" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Mark as Paid — filtered by property */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Banknote size={16} className="text-emerald-600"/> Mark as Paid
        </h3>
        {filteredInvoices.length === 0 ? (
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
                {filteredInvoices.map(inv => {
                  const invId = inv.id as string
                  const unit  = inv.units as { property_id?: string; unit_number: string; properties: { name: string } } | null
                  return (
                    <tr key={invId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{(inv.tenants as { full_name: string })?.full_name}</td>
                      <td className="px-4 py-3 text-slate-500">{unit?.unit_number}</td>
                      <td className="px-4 py-3 font-bold"><OmrAmount value={Number(inv.amount)} /></td>
                      <td className="px-4 py-3 text-slate-500">{inv.due_date as string}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {inv.status as string}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MarkPaidModal invoiceId={invId} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Payments — filtered by property */}
      {filteredRecent.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500"/> Recent Payments
          </h3>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Tenant</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Method</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Amount</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Paid Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecent.map(inv => (
                  <tr key={inv.id as string}>
                    <td className="px-4 py-3 font-medium">{(inv.tenants as { full_name: string })?.full_name}</td>
                    <td className="px-4 py-3 text-slate-500">{methodLabel[inv.payment_method as string] ?? inv.payment_method as string}</td>
                    <td className="px-4 py-3 font-bold"><OmrAmount value={Number(inv.amount)} /></td>
                    <td className="px-4 py-3 text-slate-500">{(inv.paid_date as string) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
