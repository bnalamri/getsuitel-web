import { createClient } from '@/lib/supabase/server'
import { CreditCard, CheckCircle, Mail, Upload, AlertTriangle, Calendar, Building2, Home, Users } from 'lucide-react'
import ProofUploadButton from './ProofUploadButton'

export const metadata = { title: 'Subscription' }

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('organization_id, full_name').eq('id', user.id).single()
  const { data: org } = profile?.organization_id
    ? await supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
    : { data: null }

  const plans = [
    {
      name: 'Basic',
      price: '$29',
      desc: 'Perfect for individual landlords',
      limits: { properties: 2, units: 10, tenants: 15 },
      extras: ['Invoicing & contracts', 'Maintenance requests', 'Email notices', 'Standard support'],
    },
    {
      name: 'Pro',
      price: '$79',
      desc: 'For growing property portfolios',
      limits: { properties: 10, units: 50, tenants: 75 },
      extras: ['Everything in Basic', 'Advanced reports', 'Team management', 'File attachments', 'Priority support'],
    },
    {
      name: 'Enterprise',
      price: '$199',
      desc: 'For large real estate companies',
      limits: { properties: 20, units: null, tenants: null },
      extras: ['Everything in Pro', 'Custom branding', 'Dedicated account manager', 'API access', 'SLA guarantee'],
    },
  ]

  const ownerName  = (profile as { full_name?: string } | null)?.full_name ?? user.email ?? ''
  const orgName    = (org as { name?: string } | null)?.name ?? ''
  const expiresAt  = (org as { subscription_expires_at?: string } | null)?.subscription_expires_at
  const daysLeft   = expiresAt
    ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
    : null
  const orgData = org as { subscription_plan?: string; subscription_status?: string; max_properties?: number; max_units?: number; max_tenants?: number; id?: string } | null

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Subscription</h2>
        {org && (
          <p className="text-slate-500 text-sm mt-0.5">
            Current plan: <strong className="capitalize">{orgData?.subscription_plan}</strong>
            {' · '}
            <span className="capitalize">{orgData?.subscription_status}</span>
            {expiresAt && daysLeft !== null && daysLeft > 0 && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Calendar size={12} className="inline"/>
                Active until <strong>{new Date(expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
              </span>
            )}
          </p>
        )}
        {daysLeft !== null && daysLeft <= 14 && daysLeft > 0 && (
          <div className="mt-2 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm">
            <AlertTriangle size={15} className="flex-shrink-0"/>
            Your subscription expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>. Submit a payment proof below to renew.
          </div>
        )}
        {daysLeft !== null && daysLeft <= 0 && (
          <div className="mt-2 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm">
            <AlertTriangle size={15} className="flex-shrink-0"/>
            Your subscription has expired. Submit a payment proof below to reactivate.
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map(p => {
          const current = orgData?.subscription_plan === p.name.toLowerCase()
          const subject = encodeURIComponent(`Plan Change Request — ${p.name} Plan`)
          const body = encodeURIComponent(
            `Hello GetSuitel Team,\n\nI would like to request a plan change to the ${p.name} plan.\n\nAccount details:\nName: ${ownerName}\nOrganization: ${orgName}\nEmail: ${user.email}\n\nPlease contact me to discuss the details and process this request.\n\nThank you.`
          )
          const mailtoHref = `mailto:billing@getsuitel.com?subject=${subject}&body=${body}`

          // For the current plan, show actual DB limits; for others show plan defaults
          const maxProps    = current && orgData?.max_properties != null ? orgData.max_properties : p.limits.properties
          const maxUnits    = current && orgData?.max_units    != null ? orgData.max_units    : p.limits.units
          const maxTenants  = current && orgData?.max_tenants  != null ? orgData.max_tenants  : p.limits.tenants

          return (
            <div key={p.name} className={`card p-5 flex flex-col ${current ? 'ring-2 ring-navy-700' : ''}`}>
              {current && <div className="text-xs font-bold text-navy-700 mb-2 uppercase tracking-wide">Current Plan</div>}
              <div className="text-lg font-bold text-slate-900">{p.name}</div>
              <div className="text-xs text-slate-400 mb-2">{p.desc}</div>

              <ul className="space-y-1.5 mt-3 flex-1">
                {/* Limit features — show actual values for current plan */}
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
                  {maxProps != null ? `Up to ${maxProps} properties` : 'Unlimited properties'}
                  {current && orgData?.max_properties != null && orgData.max_properties !== p.limits.properties && (
                    <span className="text-xs text-navy-600 bg-navy-50 border border-navy-200 px-1.5 py-0.5 rounded-full ml-auto">custom</span>
                  )}
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
                  {maxUnits != null ? `Up to ${maxUnits} units` : 'Unlimited units'}
                  {current && orgData?.max_units != null && orgData.max_units !== p.limits.units && (
                    <span className="text-xs text-navy-600 bg-navy-50 border border-navy-200 px-1.5 py-0.5 rounded-full ml-auto">custom</span>
                  )}
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
                  {maxTenants != null ? `Up to ${maxTenants} tenants` : 'Unlimited tenants'}
                  {current && orgData?.max_tenants != null && orgData.max_tenants !== p.limits.tenants && (
                    <span className="text-xs text-navy-600 bg-navy-50 border border-navy-200 px-1.5 py-0.5 rounded-full ml-auto">custom</span>
                  )}
                </li>
                {/* Non-limit features */}
                {p.extras.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              {!current && (
                <a href={mailtoHref} className="btn-secondary w-full mt-4 text-sm text-center block">
                  Plan Change Request
                </a>
              )}
            </div>
          )
        })}
      </div>

      <div className="card p-4 flex items-center gap-3 text-sm text-slate-600">
        <Mail size={18} className="text-slate-400 flex-shrink-0" />
        <span>
          To upgrade, click the &ldquo;Plan Change Request&rdquo; button — it opens a pre-filled email to{' '}
          <a href="mailto:billing@getsuitel.com" className="text-navy-700 font-medium hover:underline">billing@getsuitel.com</a>.
          {' '}GetSuitel team will contact you within 24 hours.
        </span>
      </div>

      {/* Submit payment proof */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Upload size={16} className="text-navy-700"/> Submit Payment Proof
        </h3>
        <p className="text-slate-500 text-sm mb-4">
          Already made a bank or mobile transfer for your subscription? Upload your transaction slip here and our billing team will confirm within 24 hours.
        </p>
        <ProofUploadButton
          orgId={orgData?.id ?? ''}
          ownerEmail={user.email ?? ''}
          ownerName={ownerName}
          plan={orgData?.subscription_plan ?? ''}
        />
      </div>
    </div>
  )
}
