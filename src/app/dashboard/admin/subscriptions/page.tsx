import { createClient } from '@/lib/supabase/server'
import { CreditCard, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Subscriptions' }

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

export default async function SubscriptionsPage() {
  const supabase = await createClient()

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*, profiles!organizations_owner_id_fkey(full_name, email)')
    .order('subscription_status')
    .order('created_at', { ascending: false })

  const list = orgs ?? []
  const byStatus = {
    past_due: list.filter(o => o.subscription_status === 'past_due'),
    trialing: list.filter(o => o.subscription_status === 'trialing'),
    active: list.filter(o => o.subscription_status === 'active'),
    canceled: list.filter(o => o.subscription_status === 'canceled'),
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Subscriptions</h2>
        <p className="text-slate-500 text-sm mt-0.5">{list.length} organizations</p>
      </div>

      {/* Past due alert */}
      {byStatus.past_due.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-800">{byStatus.past_due.length} organization{byStatus.past_due.length > 1 ? 's' : ''} past due</div>
            <div className="text-xs text-red-700 mt-0.5">{byStatus.past_due.map(o => o.name).join(', ')}</div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active', count: byStatus.active.length, color: 'text-green-700' },
          { label: 'Trialing', count: byStatus.trialing.length, color: 'text-yellow-700' },
          { label: 'Past Due', count: byStatus.past_due.length, color: 'text-red-600' },
          { label: 'Canceled', count: byStatus.canceled.length, color: 'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-3xl font-black ${s.color}`}>{s.count}</div>
            <div className="text-sm text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Full table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Organization</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Owner</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Plan</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Trial Ends</th>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold">Limits</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map(org => {
              const owner = org.profiles as { full_name: string; email: string } | null
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
                    {trialDays !== null ? (
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
