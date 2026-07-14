'use client'
import { useState } from 'react'
import Link from 'next/link'

const planColor: Record<string, string> = {
  basic: 'bg-slate-100 text-slate-600',
  pro: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}
const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-yellow-100 text-yellow-700',
  past_due: 'bg-red-100 text-red-700',
  canceled: 'bg-slate-100 text-slate-400',
}

interface Org {
  id: string
  name: string
  subscription_plan: string
  subscription_status: string
  subscription_expires_at?: string
  trial_ends_at?: string
  max_units?: number
  max_tenants?: number
  profiles: { full_name: string; email: string } | null
}

export default function SubscriptionsTable({ orgs }: { orgs: Org[] }) {
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const filtered = orgs.filter(org => {
    if (filterPlan && org.subscription_plan !== filterPlan) return false
    if (filterStatus && org.subscription_status !== filterStatus) return false
    return true
  })

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select className="input text-sm" value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
          <option value="">All plans</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select className="input text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
        </select>
        {(filterPlan || filterStatus) && (
          <button onClick={() => { setFilterPlan(''); setFilterStatus('') }}
            className="text-xs text-slate-500 hover:text-slate-700 underline">
            Clear
          </button>
        )}
        <span className="text-sm text-slate-400 ml-auto">{filtered.length} of {orgs.length}</span>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Organization</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Owner</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Plan</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Period</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Limits</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No organizations match the selected filters.</td></tr>
            ) : filtered.map(org => {
              const owner = org.profiles
              const isActive = org.subscription_status === 'active'
              const expiresAt = org.subscription_expires_at
              const trialDays = org.trial_ends_at
                ? Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000)
                : null
              return (
                <tr key={org.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{org.name}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    <div>{owner?.full_name}</div>
                    <div className="text-slate-400">{owner?.email}</div>
                  </td>
                  <td className="px-4 py-3"><span className={`badge capitalize ${planColor[org.subscription_plan]}`}>{org.subscription_plan}</span></td>
                  <td className="px-4 py-3"><span className={`badge capitalize ${statusColor[org.subscription_status]}`}>{org.subscription_status.replace('_',' ')}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {isActive && expiresAt ? (
                      <span className="text-green-700 font-medium">
                        Until {new Date(expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    ) : trialDays !== null ? (
                      <span className={trialDays <= 7 ? 'text-red-600 font-medium' : trialDays <= 14 ? 'text-orange-600' : ''}>
                        {trialDays > 0 ? `${trialDays} days` : 'Expired'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{org.max_units} units / {org.max_tenants} tenants</td>
                  <td className="px-4 py-3">
                    <Link href="/dashboard/admin/owners" className="text-xs text-navy-700 hover:underline">Manage</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
