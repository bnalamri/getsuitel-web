'use client'
import { useState } from 'react'
import { Receipt } from 'lucide-react'
import UpdateChequeButton from './UpdateChequeButton'
import DeleteChequeButton from './DeleteChequeButton'

const statusColor: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  deposited: 'bg-blue-100 text-blue-700',
  cleared:   'bg-green-100 text-green-700',
  bounced:   'bg-red-100 text-red-700',
  returned:  'bg-orange-100 text-orange-700',
  cancelled: 'bg-slate-100 text-slate-500',
  replaced:  'bg-purple-100 text-purple-700',
}

interface Cheque {
  id: string
  cheque_number: string
  bank_name: string
  amount: number
  due_date: string
  status: string
  sequence_number?: number
  total_cheques?: number
  tenants?: { full_name: string } | null
  units?: { unit_number: string } | null
}

interface Unit { id: string; unit_number: string }

export default function ChequeTable({ cheques, units }: { cheques: Cheque[]; units: Unit[] }) {
  const [filterUnit, setFilterUnit] = useState('')
  const today = new Date().toISOString().split('T')[0]

  const filtered = cheques
    .filter(c => filterUnit === '' || (c.units as { unit_number: string } | null)?.unit_number === filterUnit)
    .sort((a, b) => {
      const unitA = (a.units as { unit_number: string } | null)?.unit_number ?? ''
      const unitB = (b.units as { unit_number: string } | null)?.unit_number ?? ''
      const unitCmp = unitA.localeCompare(unitB)
      if (unitCmp !== 0) return unitCmp
      return (a.due_date ?? '').localeCompare(b.due_date ?? '')
    })

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Receipt size={16} />
          {filterUnit ? `Cheques — Unit ${filterUnit}` : `All Cheques`}
          <span className="text-slate-400 font-normal text-sm">({filtered.length})</span>
        </h3>
        <select
          className="input w-48 text-sm"
          value={filterUnit}
          onChange={e => setFilterUnit(e.target.value)}
        >
          <option value="">All units</option>
          {units.map(u => (
            <option key={u.id} value={u.unit_number}>{u.unit_number}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">
          {cheques.length === 0 ? 'No cheques registered yet.' : 'No cheques for this unit.'}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Cheque #</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Tenant</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Unit</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Bank</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Amount</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Due Date</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Seq</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => {
                const isPast = c.due_date <= today && c.status === 'pending'
                return (
                  <tr key={c.id} className={`hover:bg-slate-50 ${isPast ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{c.cheque_number}</td>
                    <td className="px-4 py-3">{(c.tenants as { full_name: string } | null)?.full_name}</td>
                    <td className="px-4 py-3 text-slate-500">{(c.units as { unit_number: string } | null)?.unit_number}</td>
                    <td className="px-4 py-3 text-slate-500">{c.bank_name}</td>
                    <td className="px-4 py-3 font-bold">{Number(c.amount).toLocaleString()} OMR</td>
                    <td className={`px-4 py-3 ${isPast ? 'text-amber-700 font-semibold' : 'text-slate-500'}`}>{c.due_date}</td>
                    <td className="px-4 py-3 text-slate-400 text-center">
                      {c.sequence_number && c.total_cheques ? `${c.sequence_number}/${c.total_cheques}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <UpdateChequeButton chequeId={c.id} currentStatus={c.status} />
                        <DeleteChequeButton chequeId={c.id} chequeNumber={c.cheque_number} />
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
