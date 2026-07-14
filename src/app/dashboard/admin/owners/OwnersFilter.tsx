'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Building2, Users, Home, FileText, User, Landmark, RotateCcw } from 'lucide-react'
import ChangeSubscriptionForm from './ChangeSubscriptionForm'
import EditLimitsForm from './EditLimitsForm'
import EditOrgForm from './EditOrgForm'
import ForcePurgeButton from './ForcePurgeButton'

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
  name_ar?: string
  owner_id: string
  owner_type?: string
  subscription_plan: string
  subscription_status: string
  subscription_expires_at?: string
  trial_ends_at?: string
  max_properties?: number
  max_units?: number
  max_tenants?: number
  cr_number?: string
  authorized_rep?: string
  cr_document_url?: string
  created_at: string
  profiles: { full_name: string; email: string; phone?: string; national_id?: string } | null
}

interface Counts {
  props: Record<string, number>
  units: Record<string, number>
  tenants: Record<string, number>
}

export default function OwnersFilter({ orgs, counts }: { orgs: Org[]; counts: Counts }) {
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')

  const filtered = orgs.filter(org => {
    if (filterPlan && org.subscription_plan !== filterPlan) return false
    if (filterStatus && org.subscription_status !== filterStatus) return false
    if (filterType && (org.owner_type ?? 'individual') !== filterType) return false
    return true
  })

  return (
    <div className="space-y-4">
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
          <option value="trialing">Trialing</option>
          <option value="active">Active</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
        </select>
        <select className="input text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All types</option>
          <option value="individual">Individual</option>
          <option value="company">Company</option>
        </select>
        {(filterPlan || filterStatus || filterType) && (
          <button
            onClick={() => { setFilterPlan(''); setFilterStatus(''); setFilterType('') }}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Clear filters
          </button>
        )}
        <span className="text-sm text-slate-400 ml-auto">{filtered.length} of {orgs.length}</span>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">No organizations match the selected filters.</div>
      ) : (
        filtered.map(org => {
          const owner = org.profiles
          const isActive = org.subscription_status === 'active'
          const expiresAt = org.subscription_expires_at
          const trialDays = org.trial_ends_at
            ? Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000)
            : null
          const propC = counts.props[org.id] ?? 0
          const unitC = counts.units[org.id] ?? 0
          const tenantC = counts.tenants[org.id] ?? 0

          return (
            <div key={org.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900">{org.name}</h3>
                    {org.name_ar && <span className="text-slate-400 text-sm" dir="rtl">{org.name_ar}</span>}
                    {org.owner_type === 'company'
                      ? <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full"><Landmark size={10}/> Company</span>
                      : <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full"><User size={10}/> Individual</span>
                    }
                  </div>
                  <div className="text-sm text-slate-500 mt-1">{owner?.full_name} &middot; {owner?.email}</div>
                  {owner?.phone && <div className="text-xs text-slate-400">{owner.phone}</div>}

                  {org.owner_type === 'company' && (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {org.cr_number && (
                        <div className="text-xs text-slate-600">
                          <span className="text-slate-400">CR No.</span> <span className="font-medium">{org.cr_number}</span>
                        </div>
                      )}
                      {org.authorized_rep && (
                        <div className="text-xs text-slate-600">
                          <span className="text-slate-400">Authorized Rep.</span> <span className="font-medium">{org.authorized_rep}</span>
                        </div>
                      )}
                      {org.cr_document_url ? (
                        <a href={org.cr_document_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 hover:text-navy-900 bg-navy-50 hover:bg-navy-100 border border-navy-200 px-2.5 py-1 rounded-lg transition-colors">
                          <FileText size={11}/> View CR Document
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                          No document uploaded
                        </span>
                      )}
                    </div>
                  )}

                  {isActive && expiresAt ? (
                    <div className="text-xs text-green-700 mt-1">
                      Active until {new Date(expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  ) : trialDays !== null && trialDays > 0 && org.subscription_status === 'trialing' ? (
                    <div className="text-xs text-yellow-700 mt-1">Trial ends in {trialDays} days</div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge capitalize ${planColor[org.subscription_plan] ?? 'bg-slate-100 text-slate-600'}`}>
                    {org.subscription_plan}
                  </span>
                  <span className={`badge capitalize ${statusColor[org.subscription_status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {org.subscription_status.replace('_', ' ')}
                  </span>
                  <ChangeSubscriptionForm
                    orgId={org.id}
                    currentPlan={org.subscription_plan}
                    currentStatus={org.subscription_status}
                    currentExpiresAt={org.subscription_expires_at}
                    currentTrialEndsAt={org.trial_ends_at}
                  />
                  <EditLimitsForm
                    orgId={org.id}
                    orgName={org.name}
                    currentMaxProperties={org.max_properties ?? 2}
                    currentMaxUnits={org.max_units ?? 10}
                    currentMaxTenants={org.max_tenants ?? 15}
                    usedProperties={propC}
                    usedUnits={unitC}
                    usedTenants={tenantC}
                  />
                  <EditOrgForm
                    orgId={org.id}
                    ownerId={org.owner_id}
                    ownerType={org.owner_type ?? 'individual'}
                    currentName={org.name}
                    currentNameAr={org.name_ar}
                    currentCrNumber={org.cr_number}
                    currentAuthorizedRep={org.authorized_rep}
                    currentNationalId={owner?.national_id}
                  />
                  {org.subscription_status === 'canceled' && (
                    <ForcePurgeButton orgId={org.id} orgName={org.name} />
                  )}
                  <Link
                    href={`/dashboard/admin/restore/${org.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <RotateCcw size={11} /> Restore
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                {[
                  { icon: Building2, label: 'Properties', value: propC,   max: org.max_properties ?? null },
                  { icon: Home,      label: 'Units',      value: unitC,   max: org.max_units ?? null },
                  { icon: Users,     label: 'Tenants',    value: tenantC, max: org.max_tenants ?? null },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 text-sm">
                    <s.icon size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="font-semibold text-slate-900">{s.value}</span>
                    <span className="text-slate-400">{s.label}</span>
                    {s.max != null && <span className="text-slate-300 text-xs">/ {s.max}</span>}
                  </div>
                ))}
              </div>

              <div className="text-xs text-slate-400 mt-3">
                Joined {new Date(org.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
