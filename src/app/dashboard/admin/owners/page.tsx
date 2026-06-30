import { createClient } from '@/lib/supabase/server'
import { Shield, Building2, Users, Home } from 'lucide-react'
import ChangeSubscriptionForm from './ChangeSubscriptionForm'

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
  const supabase = await createClient()

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*, profiles!organizations_owner_id_fkey(full_name, email, phone)')
    .order('created_at', { ascending: false })

  // Get counts per org
  const orgIds = (orgs ?? []).map(o => o.id)
  const [propsRes, unitsRes, tenantsRes] = orgIds.length > 0 ? await Promise.all([
    supabase.from('properties').select('id, organization_id').in('organization_id', orgIds),
    supabase.from('units').select('id, organization_id').in('organization_id', orgIds),
    supabase.from('tenants').select('id, organization_id').in('organization_id', orgIds),
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
            const owner = org.profiles as { full_name: string; email: string; phone: string } | null
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
                    </div>
                    <div className="text-sm text-slate-500 mt-1">{owner?.full_name} · {owner?.email}</div>
                    {owner?.phone && <div className="text-xs text-slate-400">{owner.phone}</div>}
                    {trialDays !== null && trialDays > 0 && org.subscription_status === 'trialing' && (
                      <div className="text-xs text-yellow-700 mt-1">Trial ends in {trialDays} days</div>
                    )}
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
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                  {[
                    { icon: Building2, label: 'Properties', value: propCount(org.id), max: null },
                    { icon: Home, label: 'Units', value: unitCount(org.id), max: org.max_units },
                    { icon: Users, label: 'Tenants', value: tenantCount(org.id), max: org.max_tenants },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2 text-sm">
                      <s.icon size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="font-semibold text-slate-900">{s.value}</span>
                      <span className="text-slate-400">{s.label}</span>
                      {s.max && <span className="text-slate-300 text-xs">/ {s.max}</span>}
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
