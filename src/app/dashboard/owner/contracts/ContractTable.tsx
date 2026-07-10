'use client'
import { useState } from 'react'
import { Calendar } from 'lucide-react'
import EditContractForm from './EditContractForm'
import DeleteContractButton from './DeleteContractButton'
import ActivateContractButton from './ActivateContractButton'

const statusColor: Record<string, string> = {
  draft:      'bg-slate-100 text-slate-600',
  active:     'bg-green-100 text-green-700',
  expired:    'bg-red-100 text-red-700',
  terminated: 'bg-orange-100 text-orange-700',
}

const statusOrder: Record<string, number> = { active: 0, draft: 1, expired: 2, terminated: 3 }

interface Contract {
  id: string; tenant_id: string; unit_id: string; start_date: string; end_date: string
  rent_amount: number; currency: string; deposit_amount: number; payment_day: number
  payment_method: string; status: string
  tenants?: { full_name: string } | null
  units?: { unit_number: string; properties?: { name: string } | null } | null
}
interface Tenant { id: string; full_name: string }
interface Unit   { id: string; unit_number: string; properties?: { name: string } | null }

export default function ContractTable({
  contracts, tenants, allUnits,
}: {
  contracts: Contract[]
  tenants: Tenant[]
  allUnits: Unit[]
}) {
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUnit,   setFilterUnit]   = useState('')

  const daysLeft = (endDate: string) => Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)

  const uniqueUnits = Array.from(
    new Map(contracts.map(c => [(c.units as Unit | null)?.unit_number ?? '', c.units])).entries()
  ).filter(([k]) => k).sort(([a], [b]) => a.localeCompare(b))

  const filtered = contracts
    .filter(c => filterStatus === '' || c.status === filterStatus)
    .filter(c => filterUnit   === '' || (c.units as Unit | null)?.unit_number === filterUnit)
    .sort((a, b) => {
      const statusCmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
      if (statusCmp !== 0) return statusCmp
      return ((a.units as Unit | null)?.unit_number ?? '').localeCompare((b.units as Unit | null)?.unit_number ?? '')
    })

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3 justify-end">
        <select className="input w-36 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
        </select>
        <select className="input w-44 text-sm" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
          <option value="">All units</option>
          {uniqueUnits.map(([unitNum]) => (
            <option key={unitNum} value={unitNum}>Unit {unitNum}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">No contracts match the selected filters.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Tenant</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Unit</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Period</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Rent</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => {
                const tenant = c.tenants as { full_name: string } | null
                const unit   = c.units   as { unit_number: string; properties?: { name: string } | null } | null
                const days   = daysLeft(c.end_date)
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{tenant?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{unit?.properties?.name}</div>
                      <div className="text-xs text-slate-400">Unit {unit?.unit_number}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1 text-xs"><Calendar size={11} />{c.start_date} → {c.end_date}</div>
                      {c.status === 'active' && days <= 60 && days > 0 && (
                        <div className="text-xs text-orange-600 mt-0.5">Expires in {days} days</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{Number(c.rent_amount).toLocaleString()} {c.currency}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${statusColor[c.status]}`}>{c.status}</span>
                        {c.status === 'draft' && <ActivateContractButton contractId={c.id} unitId={c.unit_id} />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <EditContractForm
                          contract={{
                            id: c.id, tenant_id: c.tenant_id, unit_id: c.unit_id,
                            start_date: c.start_date, end_date: c.end_date,
                            rent_amount: Number(c.rent_amount), currency: c.currency,
                            deposit_amount: Number(c.deposit_amount ?? 0),
                            payment_day: Number(c.payment_day ?? 1),
                            payment_method: c.payment_method ?? 'cash', status: c.status,
                          }}
                          tenants={tenants}
                          units={allUnits as never}
                        />
                        <DeleteContractButton contractId={c.id} tenantName={tenant?.full_name ?? '—'} unitNumber={unit?.unit_number ?? '—'} />
                      </div>
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
