import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Users, Phone, Mail, ArrowRight, UserCheck, AlertTriangle } from 'lucide-react'
import AddTenantForm from './AddTenantForm'
import EditTenantForm from './EditTenantForm'
import DeleteTenantButton from './DeleteTenantButton'
import AcceptMemberButton from './AcceptMemberButton'
import ResendVerificationButton from './ResendVerificationButton'
import RemovePendingButton from './RemovePendingButton'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tenants' }

export default async function TenantsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single()
  const orgId = profile?.organization_id
  const canManage = profile?.role === 'owner' || profile?.role === 'property_manager'
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found</div>

  const admin = createAdminClient()

  const [{ data: tenants }, { count: unitsCount }, { data: pendingProfiles }] = await Promise.all([
    supabase.from('tenants').select('*, contracts(id, status, unit_id, units(unit_number, properties(name)))').eq('organization_id', orgId).order('created_at', { ascending: false }),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    admin.from('profiles').select('id, full_name, email, phone').eq('organization_id', orgId).eq('role', 'tenant'),
  ])

  // Check email verification only for the pending profiles (targeted, not all users)
  const confirmedEmails = new Set<string>()
  if (pendingProfiles && pendingProfiles.length > 0) {
    const checks = await Promise.all(pendingProfiles.map(p => admin.auth.admin.getUserById(p.id)))
    checks.forEach(r => { if (r.data?.user?.email_confirmed_at) confirmedEmails.add(r.data.user.id) })
  }

  // Filter out profiles that already have a tenant record
  const linkedProfileIds = new Set(
    (tenants ?? []).map((t: { profile_id?: string | null }) => t.profile_id).filter(Boolean)
  )
  const pendingMembers = (pendingProfiles ?? [])
    .filter(p => !linkedProfileIds.has(p.id))
    .map(p => ({ ...p, emailVerified: confirmedEmails.has(p.id) }))

  const hasUnits = (unitsCount ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tenants</h2>
          <p className="text-slate-500 text-sm mt-0.5">{tenants?.length ?? 0} tenants</p>
        </div>
        {hasUnits && canManage && <AddTenantForm orgId={orgId} />}
      </div>

      {/* Pending members — registered via invite but not yet linked (owner/PM only) */}
      {canManage && pendingMembers.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200">
            <UserCheck size={16} className="text-amber-600" />
            <span className="font-semibold text-amber-800 text-sm">
              {(() => {
                const ready = pendingMembers.filter(p => p.emailVerified).length
                const unverified = pendingMembers.filter(p => !p.emailVerified).length
                if (ready > 0 && unverified > 0)
                  return `${ready} ready to add · ${unverified} awaiting email verification`
                if (ready > 0)
                  return `${ready} member${ready > 1 ? 's' : ''} ready to add as tenant`
                return `${unverified} member${unverified > 1 ? 's' : ''} awaiting email verification`
              })()}
            </span>
          </div>
          <div className="divide-y divide-amber-100">
            {pendingMembers.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{p.full_name}</span>
                    {!p.emailVerified && (
                      <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                        <AlertTriangle size={10} /> Email not verified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-slate-500"><Mail size={11} />{p.email}</span>
                    {p.phone && <span className="flex items-center gap-1 text-xs text-slate-400"><Phone size={11} />{p.phone}</span>}
                  </div>
                  {!p.emailVerified && (
                    <div className="text-xs text-red-500 mt-1">
                      This tenant must verify their email before they can be added.
                    </div>
                  )}
                </div>
                {p.emailVerified
                  ? <AcceptMemberButton profile={p} />
                  : (
                    <div className="flex items-center gap-2">
                      <ResendVerificationButton userId={p.id} email={p.email} name={p.full_name} />
                      <RemovePendingButton userId={p.id} name={p.full_name} />
                    </div>
                  )
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasUnits ? (
        <div className="card p-16 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">Set up your properties first</h3>
          <p className="text-slate-400 text-sm mb-6">You need to add a property and at least one unit before you can add tenants.</p>
          <div className="flex items-center justify-center gap-3 text-sm">
            <Link href="/dashboard/owner/properties" className="btn-primary flex items-center gap-2">
              Go to Properties <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : tenants?.length === 0 ? (
        <div className="card p-16 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">No tenants yet</h3>
          <p className="text-slate-400 text-sm">Add tenants to assign them to units and create contracts.</p>
        </div>
      ) : hasUnits && (
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
              {tenants?.map(t => {
                const contracts = t.contracts as { id: string; status: string; units: { unit_number: string; properties: { name: string } | null } | null }[]
                const active = contracts?.find(c => c.status === 'active')
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
                      {unit ? <><div>{unit.properties?.name}</div><div className="text-xs text-slate-400">Unit {unit.unit_number}</div></> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {active ? (
                        <span className="badge bg-green-100 text-green-700">Active</span>
                      ) : contracts?.length > 0 ? (
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
