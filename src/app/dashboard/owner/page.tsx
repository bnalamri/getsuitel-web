import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Building2, DoorOpen, Users, Receipt, Wrench, TrendingUp, AlertCircle, Bell, CreditCard } from 'lucide-react'
import Link from 'next/link'
import WelcomeModal from '@/components/WelcomeModal'
import StaffWelcomeModal from '@/components/StaffWelcomeModal'
import OnboardingChecklist, { type OnboardingStep } from '@/components/OnboardingChecklist'

export const metadata = { title: 'Owner Dashboard' }

export default async function OwnerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const role = profile?.role as string ?? 'owner'
  const isOwner = role === 'owner'
  const isPropertyManager = role === 'property_manager'
  const isFinancialManager = role === 'financial_manager'
  const isDemo = user.email === process.env.DEMO_EMAIL

  // Use admin client for org lookup so staff (property_manager / financial_manager) bypass RLS
  const admin = createAdminClient()
  let org: Record<string, unknown> | null = null
  if (profile?.organization_id) {
    const { data } = await admin.from('organizations').select('*').eq('id', profile.organization_id).single()
    org = data
  }
  // Owner fallback: org exists but profile link wasn't set (shouldn't happen for staff)
  if (!org && isOwner) {
    const { data } = await admin.from('organizations').select('*').eq('owner_id', user.id).single()
    if (data) {
      org = data
      await supabase.from('profiles').update({ organization_id: data.id }).eq('id', user.id)
    }
  }

  if (!org) {
    if (isOwner) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <Building2 size={48} className="text-slate-300" />
          <h2 className="text-xl font-bold text-slate-900">Set up your organization</h2>
          <p className="text-slate-500 max-w-sm">Create your company profile to start managing properties and tenants.</p>
          <Link href="/dashboard/owner/settings" className="btn-primary">Set Up Organization</Link>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <Building2 size={48} className="text-slate-300" />
        <h2 className="text-xl font-bold text-slate-900">Account setup in progress</h2>
        <p className="text-slate-500 max-w-sm">Your account hasn&apos;t been linked to an organization yet. Please contact your owner to resolve this.</p>
      </div>
    )
  }

  const orgId = org.id as string

  // Fetch unread platform notices count
  const { data: platformNotices } = await admin
    .from('platform_notices')
    .select('id')
    .or(`target_org_id.is.null,target_org_id.eq.${orgId}`)

  const { data: platformReads } = await admin
    .from('platform_notice_reads')
    .select('notice_id')
    .eq('user_id', user.id)

  const platformReadSet = new Set((platformReads ?? []).map(r => r.notice_id))
  const unreadPlatformNotices = (platformNotices ?? []).filter(n => !platformReadSet.has(n.id)).length

  // Low-cheque alert: active contracts with ≤ 2 pending cheques
  // Only warn contracts that have EVER had a cheque — contracts with 0 total cheques don't use this payment method
  const [pendingChequeRows, allChequeRows, activeContractRows] = await Promise.all([
    admin.from('cheques').select('contract_id').eq('organization_id', orgId).eq('status', 'pending'),
    admin.from('cheques').select('contract_id').eq('organization_id', orgId),
    admin.from('contracts')
      .select('id, tenants(full_name), units(unit_number, properties(name))')
      .eq('organization_id', orgId).eq('status', 'active'),
  ])
  const chequeMap: Record<string, number> = {}
  for (const ch of pendingChequeRows.data ?? []) {
    chequeMap[ch.contract_id] = (chequeMap[ch.contract_id] ?? 0) + 1
  }
  // Set of contract IDs that have ever had any cheque (any status)
  const contractsWithCheques = new Set((allChequeRows.data ?? []).map(ch => ch.contract_id))
  type LowCheque = { id: string; tenantName: string; unit: string; count: number }
  const lowChequeContracts: LowCheque[] = (activeContractRows.data ?? [])
    .map(c => {
      const t = c.tenants as { full_name: string } | null
      const u = c.units as { unit_number: string; properties: { name: string } } | null
      return { id: c.id, tenantName: t?.full_name ?? 'Unknown', unit: `${u?.properties?.name ?? ''} — Unit ${u?.unit_number ?? ''}`, count: chequeMap[c.id] ?? 0 }
    })
    .filter(c => contractsWithCheques.has(c.id) && c.count <= 2)

  const [props, units, tenants, invoices, maintenance, contracts] = await Promise.all([
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('units').select('id, status', { count: 'exact' }).eq('organization_id', orgId),
    supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('invoices').select('id, amount, status, currency, due_date, created_at').eq('organization_id', orgId),
    supabase.from('maintenance_requests').select('id, title, status, priority, created_at').eq('organization_id', orgId).in('status', ['open', 'assigned', 'in_progress']).order('created_at', { ascending: false }).limit(5),
    supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
  ])

  const vacant = units.data?.filter(u => u.status === 'vacant').length ?? 0
  const occupied = units.data?.filter(u => u.status === 'occupied').length ?? 0
  const totalUnits = units.count ?? 0
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  }
  // Month-scoped revenue (for dashboard card)
  const paidRevenue = invoices.data?.filter(i => i.status === 'paid' && isThisMonth(i.due_date ?? i.created_at)).reduce((s, i) => s + Number(i.amount), 0) ?? 0
  const pendingRevenue = invoices.data?.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0) ?? 0
  // YTD (for sub-label context)
  const ytdRevenue = invoices.data?.filter(i => i.status === 'paid' && new Date(i.due_date ?? i.created_at).getFullYear() === thisYear).reduce((s, i) => s + Number(i.amount), 0) ?? 0
  // Arrears: prior-month unpaid (sent or overdue, due before this month)
  const monthStart = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-01`
  const arrearsInvoices = invoices.data?.filter(i =>
    ['sent', 'overdue'].includes(i.status) && (i.due_date ?? '') < monthStart
  ) ?? []
  const arrearsCount = arrearsInvoices.length
  const arrearsTotal = arrearsInvoices.reduce((s, i) => s + Number(i.amount), 0)
  // Overdue alert
  const overdueInvoices = invoices.data?.filter(i => i.status === 'overdue') ?? []
  const overdueCount = overdueInvoices.length
  const overdueTotal = overdueInvoices.reduce((s, i) => s + Number(i.amount), 0)

  const stats = [
    { label: 'Properties', value: props.count ?? 0, icon: Building2, color: 'bg-navy-50 text-navy-700', href: '/dashboard/owner/properties' },
    { label: 'Total Units', value: totalUnits, sub: `${vacant} vacant`, icon: DoorOpen, color: 'bg-blue-50 text-blue-700', href: '/dashboard/owner/units' },
    { label: 'Tenants', value: tenants.count ?? 0, icon: Users, color: 'bg-purple-50 text-purple-700', href: '/dashboard/owner/tenants' },
    { label: 'Revenue (This Month)', value: `${paidRevenue.toLocaleString()} ${(org.default_currency as string) ?? 'OMR'}`, sub: `${ytdRevenue.toLocaleString()} YTD · ${pendingRevenue.toLocaleString()} pending`, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-700', href: '/dashboard/owner/invoices' },
    { label: 'Open Maintenance', value: maintenance.count ?? maintenance.data?.length ?? 0, icon: Wrench, color: 'bg-orange-50 text-orange-700', href: '/dashboard/owner/maintenance' },
  ]

  const priorityColor: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-slate-100 text-slate-600',
  }

  const recentInvoices = invoices.data?.filter(i => i.status !== 'paid').slice(0, 5) ?? []

  const onboardingSteps: OnboardingStep[] = [
    { label: 'Add your first property',  description: 'Create a property to start organising your units.',         href: '/dashboard/owner/properties', done: (props.count ?? 0) > 0 },
    { label: 'Add a unit',               description: 'Add at least one unit inside your property.',                href: '/dashboard/owner/units',      done: (units.count ?? 0) > 0 },
    { label: 'Invite a tenant',          description: 'Register a tenant so they can access their portal.',        href: '/dashboard/owner/tenants',    done: (tenants.count ?? 0) > 0 },
    { label: 'Create a contract',        description: 'Link a tenant to a unit with a signed rental contract.',    href: '/dashboard/owner/contracts',  done: (contracts.count ?? 0) > 0 },
    { label: 'Send your first invoice',  description: 'Issue a rent invoice to start collecting payments.',        href: '/dashboard/owner/invoices',   done: (invoices.data?.length ?? 0) > 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{org.name as string}</h2>
        {isOwner && (
          <p className="text-slate-500 text-sm mt-0.5 capitalize">
            {org.subscription_plan as string} plan · {(org.subscription_status as string).replace('_', ' ')}
            {org.subscription_status === 'active' && org.subscription_expires_at && (
              <span className="ml-2 not-italic normal-case">
                · Active until <strong>{new Date(org.subscription_expires_at as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
              </span>
            )}
          </p>
        )}
      </div>

      {/* Platform notice banner */}
      {unreadPlatformNotices > 0 && (
        <Link href="/dashboard/owner/platform-notices"
          className="flex items-center gap-3 bg-navy-700 text-white rounded-xl px-5 py-3.5 hover:bg-navy-800 transition-colors">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Bell size={16} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">
              {unreadPlatformNotices === 1 ? '1 new notice' : `${unreadPlatformNotices} new notices`} from GetSuitel
            </div>
            <div className="text-xs text-white/70">Click to view platform announcements</div>
          </div>
          <span className="bg-white text-navy-700 text-xs font-bold px-2.5 py-1 rounded-full">
            {unreadPlatformNotices}
          </span>
        </Link>
      )}

      {/* Arrears banner — prior-month unpaid invoices */}
      {arrearsCount > 0 && (
        <Link href="/dashboard/owner/reports/closing"
          className="flex items-center gap-3 bg-amber-600 text-white rounded-xl px-5 py-3.5 hover:bg-amber-700 transition-colors">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Receipt size={16} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">
              {arrearsCount} carry-forward invoice{arrearsCount !== 1 ? 's' : ''} unpaid — {arrearsTotal.toLocaleString()} {(org.default_currency as string) ?? 'OMR'} outstanding
            </div>
            <div className="text-xs text-white/70">Prior-month arrears — open closing report to review and follow up</div>
          </div>
          <span className="bg-white text-amber-600 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
            View Arrears
          </span>
        </Link>
      )}

      {/* Overdue invoice alert banner */}
      {overdueCount > 0 && (
        <Link href="/dashboard/owner/invoices"
          className="flex items-center gap-3 bg-red-600 text-white rounded-xl px-5 py-3.5 hover:bg-red-700 transition-colors">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle size={16} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">
              {overdueCount} overdue invoice{overdueCount !== 1 ? 's' : ''} — {overdueTotal.toLocaleString()} {(org.default_currency as string) ?? 'OMR'} unpaid
            </div>
            <div className="text-xs text-white/70">These are past-due and need immediate attention</div>
          </div>
          <span className="bg-white text-red-600 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
            Review now
          </span>
        </Link>
      )}

      {/* Low cheque banner */}
      {lowChequeContracts.length > 0 && (
        <Link href="/dashboard/owner/cheques"
          className="flex items-center gap-3 bg-orange-500 text-white rounded-xl px-5 py-3.5 hover:bg-orange-600 transition-colors">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <CreditCard size={16} />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">
              {lowChequeContracts.length === 1
                ? `${lowChequeContracts[0].tenantName} has only ${lowChequeContracts[0].count} post-dated cheque${lowChequeContracts[0].count !== 1 ? 's' : ''} remaining`
                : `${lowChequeContracts.length} tenants are running low on post-dated cheques`}
            </div>
            <div className="text-xs text-white/80">
              {lowChequeContracts.length === 1
                ? lowChequeContracts[0].unit
                : lowChequeContracts.map(c => `${c.tenantName} (${c.count})`).join(' · ')}
            </div>
          </div>
          <span className="bg-white text-orange-600 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
            View Cheques
          </span>
        </Link>
      )}

      {/* Onboarding — owner only, skip in demo mode */}
      {isOwner && !isDemo && <OnboardingChecklist steps={onboardingSteps} orgId={orgId} />}
      {isOwner && !isDemo && <WelcomeModal userId={user.id} />}

      {/* Welcome modal — staff roles, skip in demo mode */}
      {isPropertyManager && !isDemo && <StaffWelcomeModal userId={user.id} role="property_manager" />}
      {isFinancialManager && !isDemo && <StaffWelcomeModal userId={user.id} role="financial_manager" />}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
              <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
              {s.sub && <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Open Maintenance */}
        <div className="card">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Wrench size={16} />Open Maintenance</h3>
            <Link href="/dashboard/owner/maintenance" className="text-xs text-navy-700 font-medium hover:underline">View all</Link>
          </div>
          {maintenance.data?.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No open requests</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {maintenance.data?.map(m => (
                <div key={m.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{m.title}</div>
                    <div className="text-xs text-slate-400 capitalize">{m.status.replace('_', ' ')}</div>
                  </div>
                  <span className={`badge ${priorityColor[m.priority]}`}>{m.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Invoices */}
        <div className="card">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Receipt size={16} />Pending Invoices</h3>
            <Link href="/dashboard/owner/invoices" className="text-xs text-navy-700 font-medium hover:underline">View all</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No pending invoices</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentInvoices.map(inv => (
                <div key={inv.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{Number(inv.amount).toLocaleString()} {(inv as Record<string, unknown>).currency as string ?? (org.default_currency as string) ?? 'OMR'}</div>
                  </div>
                  <span className={`badge ${inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Occupancy bar */}
      {totalUnits > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Occupancy Rate</h3>
            <span className="text-2xl font-bold text-navy-700">{Math.round((occupied / totalUnits) * 100)}%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-navy-700 rounded-full transition-all" style={{ width: `${(occupied / totalUnits) * 100}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>{occupied} occupied</span>
            <span>{vacant} vacant</span>
          </div>
        </div>
      )}

      {/* Quick actions — filtered by role */}
      {(() => {
        const allActions = [
          { label: 'Add Property',    href: '/dashboard/owner/properties',  icon: Building2,   roles: ['owner'] },
          { label: 'Add Tenant',      href: '/dashboard/owner/tenants',      icon: Users,       roles: ['owner', 'property_manager'] },
          { label: 'Create Invoice',  href: '/dashboard/owner/invoices',     icon: Receipt,     roles: ['owner', 'financial_manager'] },
          { label: 'New Maintenance', href: '/dashboard/owner/maintenance',  icon: AlertCircle, roles: ['owner', 'property_manager'] },
        ]
        const visible = allActions.filter(a => a.roles.includes(role))
        if (visible.length === 0) return null
        return (
          <div className={`grid grid-cols-2 sm:grid-cols-${visible.length} gap-3`}>
            {visible.map(a => (
              <Link key={a.label} href={a.href}
                className="card p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow cursor-pointer">
                <a.icon size={20} className="text-navy-700" />
                <span className="text-sm font-medium text-slate-700">{a.label}</span>
              </Link>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
