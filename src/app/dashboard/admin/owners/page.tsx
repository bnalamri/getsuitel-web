import { createAdminClient } from '@/lib/supabase/server'
import { Shield, Building2, Users, Home, FileText, User, Landmark, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import ChangeSubscriptionForm from './ChangeSubscriptionForm'
import EditLimitsForm from './EditLimitsForm'
import EditOrgForm from './EditOrgForm'
import ForcePurgeButton from './ForcePurgeButton'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Owners' }

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

export default async function OwnersPage() {
  noStore()
  const admin = createAdminClient()

  const { data: orgs } = await admin
    .from('organizations')
    .select('*, profiles!organizations_owner_id_fkey(full_name, email, phone, national_id)')
    .order('created_at', { ascending: false })

  // Get counts per org
  const orgIds = (orgs ?? []).map(o => o.id)
  const [propsRes, unitsRes, tenantsRes] = orgIds.length > 0 ? await Promise.all([
    admin.from('properties').select('id, organization_id').in('organization_id', orgIds),
    admin.from('units').select('id, organization_id').in('organization_id', orgIds),
    admin.from('tenants').select('id, organization_id').in('organization_id', orgIds),
  ]) : [{ data: [] }, { data: [] }, { data: [] }]

  const propCount = (id: string) => (propsRes.data ?? []).filter(p => p.organization_id === id).length
  const unitCount = (id: string) => (unitsRes.data ?? []).filter(u => u.organization_id === id).length
  const tenantCount = (id: string) => (tenantsRes.data ?? []).filter(t => t.organization_id === id).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Owners</h2>
        <p className="text-slate-500 text-sm mt-0.5">{orgs?.length ?? 0} organizations</p>
      </div>

      {(orgs ?? []).length === 0 ? (
        <div className="card p-16 text-center">
          <Shield size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">No organizations yet</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {(orgs ?? []).map(org => {
            const owner = org.profiles as { full_name: string; email: string; phone: string; national_id?: string } | null
            const isActive = org.subscription_status === 'active'
            const expiresAt = org.subscription_expires_at
            const trialDays = org.trial_ends_at
              ? Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000)
              : null
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
                      usedProperties={propCount(org.id)}
                      usedUnits={unitCount(org.id)}
                      usedTenants={tenantCount(org.id)}
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
                    { icon: Building2, label: 'Properties', value: propCount(org.id), max: org.max_properties ?? null },
                    { icon: Home,      label: 'Units',      value: unitCount(org.id),   max: org.max_units ?? null },
                    { icon: Users,     label: 'Tenants',    value: tenantCount(org.id), max: org.max_tenants ?? null },
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
          })}
        </div>
      )}
    </div>
  )
}
