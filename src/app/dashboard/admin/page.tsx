import { createClient } from '@/lib/supabase/server'
import { Shield, Building2, Users, Home, TrendingUp, CreditCard, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Admin Dashboard' }

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

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [orgsRes, usersRes, propsRes, unitsRes, tenantsRes, recentOrgsRes] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('units').select('*', { count: 'exact', head: true }),
    supabase.from('tenants').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*, profiles!organizations_owner_id_fkey(full_name, email)').order('created_at', { ascending: false }).limit(5),
  ])

  const [activeRes, trialingRes, pastDueRes] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trialing'),
    supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('subscription_status', 'past_due'),
  ])

  const stats = [
    { label: 'Organizations', value: orgsRes.count ?? 0, icon: Shield, color: 'bg-navy-50 text-navy-700', href: '/dashboard/admin/owners' },
    { label: 'Total Users', value: usersRes.count ?? 0, icon: Users, color: 'bg-blue-50 text-blue-700', href: '/dashboard/admin/owners' },
    { label: 'Properties', value: propsRes.count ?? 0, icon: Building2, color: 'bg-purple-50 text-purple-700', href: '/dashboard/admin/reports' },
    { label: 'Units', value: unitsRes.count ?? 0, icon: Home, color: 'bg-emerald-50 text-emerald-700', href: '/dashboard/admin/reports' },
    { label: 'Tenants', value: tenantsRes.count ?? 0, icon: TrendingUp, color: 'bg-orange-50 text-orange-700', href: '/dashboard/admin/reports' },
    { label: 'Past Due', value: pastDueRes.count ?? 0, icon: AlertCircle, color: 'bg-red-50 text-red-600', href: '/dashboard/admin/subscriptions' },
  ]

  const recentOrgs = recentOrgsRes.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={24} className="text-navy-700" />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Platform Overview</h2>
          <p className="text-slate-500 text-sm">GetSuitel superadmin</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="card p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon size={18} />
            </div>
            <div className="text-3xl font-black text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Subscription summary */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><CreditCard size={16} />Subscription Health</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active', count: activeRes.count ?? 0, color: 'text-green-700 bg-green-50' },
            { label: 'Trialing', count: trialingRes.count ?? 0, color: 'text-yellow-700 bg-yellow-50' },
            { label: 'Past Due', count: pastDueRes.count ?? 0, color: 'text-red-700 bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
              <div className="text-2xl font-black">{s.count}</div>
              <div className="text-sm font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent organizations */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Recent Organizations</h3>
          <Link href="/dashboard/admin/owners" className="text-xs text-navy-700 hover:underline">View all</Link>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {recentOrgs.map((org: Record<string, unknown>) => {
              const owner = org.profiles as { full_name: string; email: string } | null
              return (
                <tr key={org.id as string} className="hover:bg-slate-50 px-5">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{org.name as string}</div>
                    <div className="text-xs text-slate-400">{owner?.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge capitalize ${planColor[org.subscription_plan as string] ?? 'bg-slate-100 text-slate-600'}`}>
                      {org.subscription_plan as string}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge capitalize ${statusColor[org.subscription_status as string] ?? 'bg-slate-100 text-slate-600'}`}>
                      {(org.subscription_status as string).replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {new Date(org.created_at as string).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
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
