'use client'
import { useState } from 'react'
import { Mail, Phone } from 'lucide-react'
import EditTenantForm from './EditTenantForm'
import DeleteTenantButton from './DeleteTenantButton'

type Contract = {
  id: string; status: string; unit_id: string
  units: { unit_number: string; properties: { name: string } | null } | null
}
type Tenant = {
  id: string; full_name: string; email: string; phone: string
  nationality?: string | null; national_id?: string | null
  emergency_contact?: string | null; profile_id?: string | null
  contracts: Contract[]
}

export default function TenantsTable({
  tenants,
  canManage,
}: {
  tenants: Tenant[]
  canManage: boolean
}) {
  const [filterProperty, setFilterProperty] = useState('')
  const [filterContract, setFilterContract] = useState('')

  // Collect unique property names
  const allProperties = Array.from(
    new Set(
      tenants.flatMap(t =>
        (t.contracts ?? []).map(c => c.units?.properties?.name).filter(Boolean)
      )
    )
  ).sort() as string[]

  const filtered = tenants.filter(t => {
    const contracts = t.contracts ?? []
    const active = contracts.find(c => c.status === 'active')
    const unit = active?.units

    // Property filter: match against active contract's property, or any contract
    if (filterProperty) {
      const hasProperty = contracts.some(c => c.units?.properties?.name === filterProperty)
      if (!hasProperty) return false
    }

    // Contract status filter
    if (filterContract) {
      if (filterContract === 'no_contract' && contracts.length > 0) return false
      if (filterContract !== 'no_contract') {
        const hasStatus = contracts.some(c => c.status === filterContract)
        if (!hasStatus) return false
      }
    }

    return true
  })

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3 justify-end flex-wrap">
        {allProperties.length > 0 && (
          <select className="input text-sm w-44" value={filterProperty} onChange={e => setFilterProperty(e.target.value)}>
            <option value="">All Properties</option>
            {allProperties.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
        <select className="input text-sm w-44" value={filterContract} onChange={e => setFilterContract(e.target.value)}>
          <option value="">All Contracts</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
          <option value="draft">Draft</option>
          <option value="no_contract">No Contract</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">No tenants match the selected filters.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Name</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Contact</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Unit</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Contract</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(t => {
                const contracts = t.contracts ?? []
                const active = contracts.find(c => c.status === 'active')
                const unit = active?.units
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{t.full_name}</div>
                      {t.nationality && <div className="text-xs text-slate-400">{t.nationality}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-slate-600"><Mail size={12} />{t.email}</div>
                      <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5"><Phone size={11} />{t.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {unit ? (
                        <>
                          <div>{unit.properties?.name}</div>
                          <div className="text-xs text-slate-400">Unit {unit.unit_number}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {active ? (
                        <span className="badge bg-green-100 text-green-700">Active</span>
                      ) : contracts.length > 0 ? (
                        <span className="badge bg-slate-100 text-slate-600 capitalize">{contracts[0].status}</span>
                      ) : (
                        <span className="text-slate-400 text-xs">No contract</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <EditTenantForm tenant={{
                            id: t.id,
                            full_name: t.full_name,
                            email: t.email,
                            phone: t.phone,
                            nationality: t.nationality ?? null,
                            national_id: t.national_id ?? null,
                            emergency_contact: t.emergency_contact ?? null,
                          }} />
                          <DeleteTenantButton id={t.id} name={t.full_name} />
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
