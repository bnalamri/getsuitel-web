'use client'
import { useState } from 'react'
import Link from 'next/link'
import EditPropertyForm from './EditPropertyForm'
import DeletePropertyButton from './DeletePropertyButton'

type Property = {
  id: string; name: string; type: string
  address?: string | null; city?: string | null; country?: string | null
  units: { id: string; status: string }[]
}

const typeColor: Record<string, string> = {
  residential: 'bg-blue-100 text-blue-700',
  commercial:  'bg-purple-100 text-purple-700',
  mixed:       'bg-teal-100 text-teal-700',
}

export default function PropertiesTable({
  properties,
  canManage,
  isOwner,
}: {
  properties: Property[]
  canManage: boolean
  isOwner: boolean
}) {
  const [filterType, setFilterType] = useState('')

  const filtered = properties.filter(p => !filterType || p.type === filterType)

  return (
    <div className="space-y-3">
      {/* Filter row */}
      <div className="flex items-center gap-3 justify-end">
        <select
          className="input text-sm w-44"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">No properties match the selected filter.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Property</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Location</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Type</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Units</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Occupancy</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => {
                const units = p.units ?? []
                const occupied = units.filter(u => u.status === 'occupied').length
                const total = units.length
                const pct = total > 0 ? Math.round((occupied / total) * 100) : 0
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/owner/units?property=${p.id}`}
                        className="font-semibold text-slate-900 hover:text-navy-700 transition-colors"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {[p.city, p.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge capitalize ${typeColor[p.type] ?? 'bg-slate-100 text-slate-600'}`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {total} <span className="text-slate-400 text-xs">({occupied} occupied)</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-navy-700 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <EditPropertyForm property={{
                            id: p.id, name: p.name, type: p.type,
                            address: p.address ?? '', city: p.city ?? '', country: p.country ?? '',
                          }} />
                          {isOwner && <DeletePropertyButton propertyId={p.id} propertyName={p.name} />}
                        </div>
                      </td>
                    )}
                    {!canManage && <td className="px-4 py-3" />}
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
