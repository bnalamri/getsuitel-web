import { createClient } from '@/lib/supabase/server'
import { CreditCard, CheckCircle } from 'lucide-react'
export const metadata = { title: 'Subscription' }
export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const { data: org } = profile?.organization_id
    ? await supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
    : { data: null }

  const plans = [
    { name: 'Basic', price: '$29', units: 10, tenants: 15, features: ['10 Units', '15 Tenants', 'Invoicing', 'Maintenance'] },
    { name: 'Pro', price: '$79', units: 50, tenants: 75, features: ['50 Units', '75 Tenants', 'All Basic features', 'Reports', 'Team management'] },
    { name: 'Enterprise', price: '$199', units: 999, tenants: 999, features: ['Unlimited Units', 'Unlimited Tenants', 'All Pro features', 'Priority support', 'Custom branding'] },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Subscription</h2>
        {org && <p className="text-slate-500 text-sm mt-0.5">Current plan: <strong className="capitalize">{org.subscription_plan}</strong> · <span className="capitalize">{org.subscription_status}</span></p>}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map(p => {
          const current = org?.subscription_plan === p.name.toLowerCase()
          return (
            <div key={p.name} className={`card p-5 ${current ? 'ring-2 ring-navy-700' : ''}`}>
              {current && <div className="text-xs font-bold text-navy-700 mb-2">CURRENT PLAN</div>}
              <div className="text-lg font-bold text-slate-900">{p.name}</div>
              <div className="text-3xl font-black text-navy-700 my-2">{p.price}<span className="text-sm font-normal text-slate-400">/mo</span></div>
              <ul className="space-y-1.5 mt-3">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              {!current && <button className="btn-secondary w-full mt-4 text-sm">Upgrade to {p.name}</button>}
            </div>
          )
        })}
      </div>
      <div className="card p-4 flex items-center gap-3 text-sm text-slate-600">
        <CreditCard size={18} className="text-slate-400" />
        Stripe billing integration coming soon. Contact support to change your plan.
      </div>
    </div>
  )
}
