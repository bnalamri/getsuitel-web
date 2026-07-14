import { createAdminClient } from '@/lib/supabase/server'
import { AlertCircle } from 'lucide-react'
import { unstable_noStore as noStore } from 'next/cache'
import SubscriptionsTable from './SubscriptionsTable'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Subscriptions' }

export default async function SubscriptionsPage() {
  noStore()
  const admin = createAdminClient()

  const { data: orgs } = await admin
    .from('organizations')
    .select('*, profiles!organizations_owner_id_fkey(full_name, email)')
    .order('subscription_status')
    .order('created_at', { ascending: false })

  const list = orgs ?? []
  const byStatus = {
    past_due: list.filter(o => o.subscription_status === 'past_due'),
    trialing:  list.filter(o => o.subscription_status === 'trialing'),
    active:    list.filter(o => o.subscription_status === 'active'),
    canceled:  list.filter(o => o.subscription_status === 'canceled'),
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Subscriptions</h2>
        <p className="text-slate-500 text-sm mt-0.5">{list.length} organizations</p>
      </div>

      {byStatus.past_due.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-800">{byStatus.past_due.length} organization{byStatus.past_due.length > 1 ? 's' : ''} past due</div>
            <div className="text-xs text-red-700 mt-0.5">{byStatus.past_due.map(o => o.name).join(', ')}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active',   count: byStatus.active.length,   color: 'text-green-700' },
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

      <SubscriptionsTable orgs={list as never} />
    </div>
  )
}
