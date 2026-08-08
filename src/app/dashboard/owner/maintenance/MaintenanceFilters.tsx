'use client'
import { useState } from 'react'
import AssignTechnicianForm from './AssignTechnicianForm'
import MarkPaidButton from './MarkPaidButton'

const priorityColor: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700', low: 'bg-slate-100 text-slate-600',
}
const statusColor: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700', assigned: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700', completed: 'bg-green-100 text-green-700',
  canceled: 'bg-slate-100 text-slate-400',
}

type Technician = { id: string; full_name: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function MaintenanceFilters({ requests, technicians, canManage }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requests: any[]
  technicians: Technician[]
  canManage: boolean
}) {
  const [filterProp,    setFilterProp]    = useState<string>('')
  const [filterTech,    setFilterTech]    = useState<string>('')
  const [filterCharge,  setFilterCharge]  = useState<string>('all')

  // Derive unique property names from fetched data
  const propertyNames = Array.from(
    new Set(requests.map((r) => (r.units as { properties?: { name?: string } } | null)?.properties?.name).filter(Boolean))
  ).sort() as string[]

  // Apply filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered = requests.filter((r: any) => {
    const propName = (r.units as { properties?: { name?: string } } | null)?.properties?.name
    if (filterProp && propName !== filterProp) return false
    if (filterTech && r.technician_id !== filterTech) return false
    if (filterCharge === 'owner'  && r.charge_payer !== 'owner')  return false
    if (filterCharge === 'tenant' && r.charge_payer !== 'tenant') return false
    if (filterCharge === 'paid'   && !r.invoice_paid)             return false
    return true
  })

  const activeFilters = [filterProp, filterTech, filterCharge !== 'all' ? filterCharge : ''].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="card p-3 flex flex-wrap gap-3 items-center">
        {/* Property */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Property</span>
          <select
            value={filterProp}
            onChange={e => setFilterProp(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
          >
            <option value="">All</option>
            {propertyNames.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Technician */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Technician</span>
          <select
            value={filterTech}
            onChange={e => setFilterTech(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
          >
            <option value="">All</option>
            {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </div>

        {/* Service Charge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Charge</span>
          <select
            value={filterCharge}
            onChange={e => setFilterCharge(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
          >
            <option value="all">All</option>
            <option value="owner">Owner billed</option>
            <option value="tenant">Tenant billed</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Count + clear */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-slate-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterProp(''); setFilterTech(''); setFilterCharge('all') }}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">No requests match the selected filters.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Title</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Unit · Category</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Priority</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Assign Technician</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Service Charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {filtered.map((r: any) => {
                const unit        = r.units as { unit_number: string; properties: { name: string } | null } | null
                const techProfile = r.profiles as { full_name: string } | null
                const chargePayer  = r.charge_payer  as string | null
                const chargeAmount = r.charge_amount as number | null
                const finalAmount  = r.final_amount  as number | null
                const invoicePaid  = r.invoice_paid  as boolean | null

                let chargeCell: React.ReactNode = <span className="text-slate-300">—</span>
                if (chargePayer === 'tenant') {
                  chargeCell = (
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-amber-700">Tenant pays directly</div>
                      {chargeAmount != null && (
                        <div className="text-xs text-slate-400">Est. OMR {parseFloat(String(chargeAmount)).toFixed(3)}</div>
                      )}
                    </div>
                  )
                } else if (chargePayer === 'owner') {
                  if (invoicePaid) {
                    chargeCell = (
                      <div className="space-y-0.5">
                        <div className="text-xs font-medium text-green-700">✓ Paid</div>
                        {finalAmount != null && (
                          <div className="text-xs text-slate-500">OMR {parseFloat(String(finalAmount)).toFixed(3)}</div>
                        )}
                      </div>
                    )
                  } else if (finalAmount != null) {
                    chargeCell = (
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-slate-700">
                          OMR {parseFloat(String(finalAmount)).toFixed(3)}
                        </div>
                        <div className="text-xs text-blue-600">Invoice received</div>
                        <MarkPaidButton requestId={r.id} />
                      </div>
                    )
                  } else {
                    chargeCell = (
                      <div className="space-y-0.5">
                        <div className="text-xs font-medium text-slate-700">Owner pays</div>
                        {chargeAmount != null && (
                          <div className="text-xs text-slate-400">Est. OMR {parseFloat(String(chargeAmount)).toFixed(3)}</div>
                        )}
                        <div className="text-xs text-slate-400">Awaiting invoice</div>
                      </div>
                    )
                  }
                }

                return (
                  <tr key={r.id} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.title}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[180px]">{r.description}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="text-slate-600">{unit?.properties?.name}</div>
                      <div className="text-slate-400">Unit {unit?.unit_number}</div>
                      <div className="text-slate-400 capitalize mt-0.5">{r.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${priorityColor[r.priority]}`}>{r.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'completed' || r.status === 'canceled' ? (
                        <div className="text-xs text-slate-500">
                          {techProfile
                            ? <span className="font-medium text-slate-700">{techProfile.full_name}</span>
                            : <span className="text-slate-300">—</span>
                          }
                        </div>
                      ) : canManage ? (
                        <AssignTechnicianForm
                          requestId={r.id}
                          currentTechId={r.technician_id ?? null}
                          technicians={technicians}
                          currentChargePayer={chargePayer}
                          currentChargeAmount={chargeAmount}
                        />
                      ) : (
                        <span className="text-xs text-slate-400">{r.technician_id ? techProfile?.full_name ?? '—' : '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className={`badge ${statusColor[r.status]}`}>{r.status.replace('_', ' ')}</span>
                        {r.status === 'completed' && techProfile && (
                          <div className="text-xs text-slate-400">
                            by <span className="font-medium text-slate-600">{techProfile.full_name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{chargeCell}</td>
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
