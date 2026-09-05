import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ShieldAlert, AlertTriangle, Info, Building2, CreditCard, Wrench, FileText, CheckCircle2 } from 'lucide-react'
import OmrSymbol from '@/components/ui/OmrSymbol'

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertSeverity = 'critical' | 'warning' | 'info'

type AlertItem = {
  id:       string
  title:    string
  detail:   string
  href:     string
  severity: AlertSeverity
  icon:     React.ElementType
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AlertCenterPage() {
  const supabase = await createClient()

  const today   = new Date()
  const in30    = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const todayISO = today.toISOString().slice(0, 10)

  const [
    { data: suspendedBranches },
    { data: pastDueOrgs },
    { data: canceledOrgs },
    { data: unpaidBilling },
    { data: expiringOrgs },
    { data: allBranches },
    { data: allOrgs },
  ] = await Promise.all([
    // Suspended branches
    supabase
      .from('branches')
      .select('id, display_name, updated_at')
      .eq('status', 'suspended'),

    // Past-due orgs (with branch name)
    supabase
      .from('organizations')
      .select('id, name, branch_id, branches!organizations_branch_id_fkey(display_name)')
      .eq('subscription_status', 'past_due'),

    // Canceled orgs not yet purged
    supabase
      .from('organizations')
      .select('id, name, branch_id, canceled_at, branches!organizations_branch_id_fkey(display_name)')
      .not('canceled_at', 'is', null),

    // Unpaid branch billing records
    supabase
      .from('branch_billing')
      .select('id, branch_id, month, total_revenue_omr, license_fee_omr, status, created_at, branches!branch_billing_branch_id_fkey(display_name)')
      .neq('status', 'paid')
      .order('month', { ascending: false }),

    // Subscriptions expiring within 30 days
    supabase
      .from('organizations')
      .select('id, name, branch_id, subscription_ends_at, branches!organizations_branch_id_fkey(display_name)')
      .gte('subscription_ends_at', todayISO)
      .lte('subscription_ends_at', in30)
      .neq('subscription_status', 'canceled'),

    // All active branches (to compute empty-branch alert)
    supabase
      .from('branches')
      .select('id, display_name, status')
      .eq('status', 'active'),

    // Org counts per branch
    supabase
      .from('organizations')
      .select('id, branch_id, subscription_status'),
  ])

  // ── Derived: active branches with 0 orgs ──────────────────────────────────
  const orgsByBranch = (allOrgs ?? []).reduce<Record<string, number>>((acc, o) => {
    if (o.branch_id) acc[o.branch_id] = (acc[o.branch_id] ?? 0) + 1
    return acc
  }, {})
  const emptyBranches = (allBranches ?? []).filter(b => (orgsByBranch[b.id] ?? 0) === 0)

  // ── Build alert list ───────────────────────────────────────────────────────
  const alerts: AlertItem[] = []

  // CRITICAL: suspended branches
  for (const b of suspendedBranches ?? []) {
    alerts.push({
      id:       `suspended-${b.id}`,
      severity: 'critical',
      icon:     Building2,
      title:    `Branch suspended: ${b.display_name}`,
      detail:   `Superadmin access is blocked. Suspended ${new Date(b.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.`,
      href:     `/hq/branches/${b.id}`,
    })
  }

  // CRITICAL: past-due orgs
  for (const o of pastDueOrgs ?? []) {
    const branchName = (o.branches as unknown as { display_name: string } | null)?.display_name ?? 'Unknown branch'
    alerts.push({
      id:       `pastdue-${o.id}`,
      severity: 'critical',
      icon:     CreditCard,
      title:    `Past due: ${o.name}`,
      detail:   `${branchName} — subscription payment overdue. Owner cannot access platform.`,
      href:     `/hq/branches/${o.branch_id}`,
    })
  }

  // CRITICAL (7+ days) / WARNING (<7 days): unpaid billing — license fee overdue
  for (const row of unpaidBilling ?? []) {
    const branchName = (row.branches as unknown as { display_name: string } | null)?.display_name ?? 'Unknown'
    const month = new Date(row.month).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    const daysOverdue = Math.floor((today.getTime() - new Date(row.created_at).getTime()) / 86400000)
    const licenseFee = Number(row.license_fee_omr ?? 0).toFixed(3)

    if (daysOverdue >= 7) {
      alerts.push({
        id:       `billing-${row.id}`,
        severity: 'critical',
        icon:     FileText,
        title:    `License fee overdue: ${branchName}`,
        detail:   `${month} — OMR ${licenseFee} license fee unpaid for ${daysOverdue} days. Reminder email sent to branch superadmin.`,
        href:     `/hq/branches/${row.branch_id}`,
      })
    } else {
      alerts.push({
        id:       `billing-${row.id}`,
        severity: 'warning',
        icon:     FileText,
        title:    `Unpaid billing: ${branchName}`,
        detail:   `${month} — OMR ${Number(row.total_revenue_omr).toFixed(3)} revenue not yet settled (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago).`,
        href:     `/hq/branches/${row.branch_id}`,
      })
    }
  }

  // WARNING: expiring subscriptions
  for (const o of expiringOrgs ?? []) {
    const branchName = (o.branches as unknown as { display_name: string } | null)?.display_name ?? 'Unknown'
    const daysLeft = Math.ceil((new Date(o.subscription_ends_at).getTime() - today.getTime()) / 86400000)
    alerts.push({
      id:       `expiring-${o.id}`,
      severity: 'warning',
      icon:     CreditCard,
      title:    `Subscription expiring: ${o.name}`,
      detail:   `${branchName} — expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
      href:     `/hq/branches/${o.branch_id}`,
    })
  }

  // WARNING: canceled orgs pending purge
  for (const o of canceledOrgs ?? []) {
    const branchName = (o.branches as unknown as { display_name: string } | null)?.display_name ?? 'Unknown'
    const daysAgo = Math.floor((today.getTime() - new Date(o.canceled_at).getTime()) / 86400000)
    alerts.push({
      id:       `canceled-${o.id}`,
      severity: 'warning',
      icon:     Building2,
      title:    `Canceled org pending purge: ${o.name}`,
      detail:   `${branchName} — canceled ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago, awaiting scheduled purge.`,
      href:     `/hq/branches/${o.branch_id}`,
    })
  }

  // INFO: active branches with no orgs
  for (const b of emptyBranches) {
    alerts.push({
      id:       `empty-${b.id}`,
      severity: 'info',
      icon:     Building2,
      title:    `No orgs: ${b.display_name}`,
      detail:   'Active branch has no organisations registered yet.',
      href:     `/hq/branches/${b.id}`,
    })
  }

  // Sort: critical first, then warning, then info
  const ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }
  alerts.sort((a, b) => ORDER[a.severity] - ORDER[b.severity])

  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const warningCount  = alerts.filter(a => a.severity === 'warning').length
  const infoCount     = alerts.filter(a => a.severity === 'info').length

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <ShieldAlert className="w-6 h-6 text-yellow-600" />
          <h1 className="text-2xl font-bold text-gray-900">Alert Center</h1>
        </div>
        <p className="text-sm text-gray-500">
          Cross-branch issues requiring HQ attention — updated on every page load
        </p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <div className="text-xs text-red-500 font-medium">Critical</div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
            <div className="text-xs text-amber-500 font-medium">Warnings</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div>
            <div className="text-2xl font-bold text-blue-600">{infoCount}</div>
            <div className="text-xs text-blue-500 font-medium">Info</div>
          </div>
        </div>
      </div>

      {/* All clear */}
      {alerts.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-400 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">All clear</h2>
          <p className="text-sm text-gray-500">No alerts across any branch right now.</p>
        </div>
      )}

      {/* Alert list */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

    </div>
  )
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: AlertItem }) {
  const { severity, icon: Icon, title, detail, href } = alert

  const styles = {
    critical: {
      border: 'border-red-200',
      bg:     'bg-white',
      icon:   'bg-red-100 text-red-600',
      badge:  'bg-red-100 text-red-700',
      label:  'Critical',
      dot:    'bg-red-500',
    },
    warning: {
      border: 'border-amber-200',
      bg:     'bg-white',
      icon:   'bg-amber-100 text-amber-600',
      badge:  'bg-amber-100 text-amber-700',
      label:  'Warning',
      dot:    'bg-amber-500',
    },
    info: {
      border: 'border-blue-100',
      bg:     'bg-white',
      icon:   'bg-blue-50 text-blue-500',
      badge:  'bg-blue-50 text-blue-600',
      label:  'Info',
      dot:    'bg-blue-400',
    },
  }[severity]

  return (
    <Link
      href={href}
      className={`flex items-start gap-4 p-4 rounded-xl border ${styles.border} ${styles.bg} hover:shadow-sm transition-shadow group`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${styles.icon}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm group-hover:text-yellow-700 transition-colors">
            {title}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles.badge}`}>
            {styles.label}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{detail}</p>
      </div>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${styles.dot}`} />
    </Link>
  )
}
