'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Building2, Users, Home, TrendingUp, AlertTriangle,
  Activity, DollarSign, ShieldAlert, Settings2, FileText, ExternalLink,
  ClipboardList, Loader2, SlidersHorizontal, Download,
  CheckCircle2, XCircle, PauseCircle, Archive, BarChart2, ScrollText,
} from 'lucide-react'
import OmrSymbol from '@/components/ui/OmrSymbol'
import BranchActions from './BranchActions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Org = {
  id: string
  name: string
  subscription_status: string
  subscription_plan: string
  created_at: string
  canceled_at: string | null
}

type BillingRow = {
  month: string
  total_revenue_omr: string | number
  share_amount_omr: string | number
  license_fee_omr: string | number
  status: string
}

type BranchData = {
  id: string
  display_name: string
  status: 'active' | 'suspended' | 'archived'
  license_fee_omr: number
  revenue_share_pct: number
  created_at: string
  updated_at: string
  city: string | null
  region: string | null
  max_units:   number | null
  max_staff:   number | null
  max_tenants: number | null
  max_orgs:    number | null
}

type Stats = {
  orgCount: number
  activeOrgCount: number
  propCount: number
  tenantCount: number
  maintenanceOpen: number
  maintenanceInProgress: number
  totalRevenue6mo: number
}

type Profile = { full_name: string | null; email: string; phone?: string | null } | null

type AuditLog = {
  id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
  profiles: { full_name: string | null; email: string } | null
}

type Props = {
  branch:  BranchData
  profile: Profile
  stats:   Stats
  orgs:    Org[]
  billing: BillingRow[]
}

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',  label: 'Overview',  icon: Activity      },
  { key: 'financial', label: 'Financial', icon: DollarSign    },
  { key: 'health',    label: 'Health',    icon: ShieldAlert   },
  { key: 'staff',     label: 'Orgs',      icon: Building2     },
  { key: 'actions',   label: 'Actions',   icon: Settings2     },
  { key: 'audit',     label: 'Audit',     icon: ClipboardList },
] as const

type Tab = typeof TABS[number]['key']

// ─── Root Component ───────────────────────────────────────────────────────────

const TAB_KEYS = TABS.map(t => t.key) as readonly string[]

export default function BranchCommandCenter({ branch, profile, stats, orgs, billing }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const initialTab: Tab = urlTab && TAB_KEYS.includes(urlTab) ? (urlTab as Tab) : 'overview'
  const [tab, setTabState] = useState<Tab>(initialTab)

  function setTab(key: Tab) {
    setTabState(key)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', key)
    router.replace(`/hq/branches/${branch.id}?${params.toString()}`, { scroll: false })
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === key
                ? 'border-yellow-500 text-yellow-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview'  && <OverviewTab  branch={branch} profile={profile} stats={stats} />}
      {tab === 'financial' && <FinancialTab billing={billing} branch={branch} />}
      {tab === 'health'    && <HealthTab    stats={stats} orgs={orgs} />}
      {tab === 'staff'     && <StaffTab     orgs={orgs} />}
      {tab === 'actions'   && <ActionsTab   branch={branch} orgCount={stats.orgCount} />}
      {tab === 'audit'     && <AuditTab     branchId={branch.id} />}
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ branch, profile, stats }: { branch: BranchData; profile: Profile; stats: Stats }) {
  const kpis = [
    { label: 'Organisations',    value: stats.orgCount,    icon: Building2,  color: 'blue'    },
    { label: 'Properties',       value: stats.propCount,   icon: Home,       color: 'emerald' },
    { label: 'Tenants',          value: stats.tenantCount, icon: Users,      color: 'purple'  },
    { label: 'Revenue (6 mo)',   omr: stats.totalRevenue6mo, icon: TrendingUp, color: 'amber' },
  ] as const

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(({ label, icon: Icon, color, ...rest }) => {
          const omr   = 'omr'   in rest ? rest.omr   : undefined
          const value = 'value' in rest ? rest.value : undefined
          return (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                color === 'blue'    ? 'bg-blue-50'    :
                color === 'emerald' ? 'bg-emerald-50' :
                color === 'purple'  ? 'bg-purple-50'  : 'bg-amber-50'
              }`}>
                <Icon className={`w-5 h-5 ${
                  color === 'blue'    ? 'text-blue-600'    :
                  color === 'emerald' ? 'text-emerald-600' :
                  color === 'purple'  ? 'text-purple-600'  : 'text-amber-600'
                }`} />
              </div>
              {omr !== undefined ? (
                <div className="text-xl font-bold text-gray-900 flex items-center gap-1">
                  <OmrSymbol size={17} variant="dark" /> {omr.toFixed(3)}
                </div>
              ) : (
                <div className="text-2xl font-bold text-gray-900">{value}</div>
              )}
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          )
        })}
      </div>

      {/* Superadmin + Commercial Terms */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Superadmin</h2>
          {profile ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                  {(profile.full_name ?? profile.email)[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{profile.full_name ?? '—'}</div>
                  <div className="text-xs text-gray-400">{profile.email}</div>
                </div>
              </div>
              {profile.phone && (
                <div className="text-sm text-gray-600">📞 {profile.phone}</div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No superadmin assigned yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Commercial Terms</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">License Fee / month</dt>
              <dd className="font-semibold text-gray-900 flex items-center gap-1">
                <OmrSymbol size={13} variant="dark" /> {branch.license_fee_omr.toFixed(3)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Revenue Share</dt>
              <dd className="font-semibold text-gray-900">{branch.revenue_share_pct}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Last Updated</dt>
              <dd className="text-gray-600">
                {new Date(branch.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

// ─── Financial Tab ────────────────────────────────────────────────────────────

function FinancialTab({ billing, branch }: { billing: BillingRow[]; branch: BranchData }) {
  const totalRevenue = billing.reduce((s, r) => s + Number(r.total_revenue_omr), 0)
  const totalHQShare = billing.reduce((s, r) => s + Number(r.share_amount_omr), 0)
  const paidMonths   = billing.filter(r => r.status === 'paid').length

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xl font-bold text-gray-900 flex items-center gap-1 mb-1">
            <OmrSymbol size={17} variant="dark" /> {totalRevenue.toFixed(3)}
          </div>
          <div className="text-xs text-gray-500">Total Revenue (all time)</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xl font-bold text-gray-900 flex items-center gap-1 mb-1">
            <OmrSymbol size={17} variant="dark" /> {totalHQShare.toFixed(3)}
          </div>
          <div className="text-xs text-gray-500">HQ Share (all time)</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xl font-bold text-gray-900 mb-1">
            {paidMonths} / {billing.length}
          </div>
          <div className="text-xs text-gray-500">Months Settled</div>
        </div>
      </div>

      {/* License fee info bar */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex flex-wrap gap-4">
        <span>Monthly license: <strong className="inline-flex items-center gap-1">
          <OmrSymbol size={13} variant="dark" /> {branch.license_fee_omr.toFixed(3)}
        </strong></span>
        <span>Revenue share: <strong>{branch.revenue_share_pct}%</strong></span>
      </div>

      {/* Full billing table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Full Billing History
            <span className="text-gray-400 font-normal text-sm ml-2">({billing.length} months)</span>
          </h2>
        </div>
        {billing.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No billing records yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Month</th>
                  <th className="px-5 py-3 text-right">Total Revenue</th>
                  <th className="px-5 py-3 text-right">HQ Share</th>
                  <th className="px-5 py-3 text-right">License Fee</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {billing.map(row => (
                  <tr key={row.month} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-700 font-medium">
                      {new Date(row.month).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="flex items-center justify-end gap-1 font-semibold text-gray-900">
                        <OmrSymbol size={12} variant="dark" /> {Number(row.total_revenue_omr).toFixed(3)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="flex items-center justify-end gap-1 text-gray-700">
                        <OmrSymbol size={12} variant="dark" /> {Number(row.share_amount_omr).toFixed(3)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="flex items-center justify-end gap-1 text-gray-700">
                        <OmrSymbol size={12} variant="dark" /> {Number(row.license_fee_omr).toFixed(3)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        row.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Health Tab ───────────────────────────────────────────────────────────────

function HealthTab({ stats, orgs }: { stats: Stats; orgs: Org[] }) {
  const inactiveOrgs = orgs.filter(o => o.subscription_status !== 'active' && o.subscription_status !== 'trialing')
  const pastDueOrgs  = orgs.filter(o => o.subscription_status === 'past_due')
  const canceledOrgs = orgs.filter(o => !!o.canceled_at)

  const healthScore = stats.orgCount > 0
    ? Math.round((stats.activeOrgCount / stats.orgCount) * 100)
    : 100

  const scoreColor =
    healthScore >= 80 ? 'border-green-400 text-green-600 bg-green-50' :
    healthScore >= 60 ? 'border-yellow-400 text-yellow-600 bg-yellow-50' :
                        'border-red-400 text-red-600 bg-red-50'

  const metrics = [
    { label: 'Active Orgs',          value: stats.activeOrgCount,    note: `of ${stats.orgCount} total`,      color: 'green'  },
    { label: 'Inactive / Canceled',  value: inactiveOrgs.length,     note: `${canceledOrgs.length} canceled`, color: inactiveOrgs.length > 0 ? 'red' : 'gray' },
    { label: 'Past Due',             value: pastDueOrgs.length,      note: 'need attention',                  color: pastDueOrgs.length > 0 ? 'amber' : 'gray' },
    { label: 'Properties',           value: stats.propCount,         note: 'across branch',                   color: 'blue'   },
    { label: 'Tenants',              value: stats.tenantCount,       note: 'active',                          color: 'purple' },
    { label: 'Open Maintenance',     value: stats.maintenanceOpen + stats.maintenanceInProgress,
      note: `${stats.maintenanceInProgress} in progress`,            color: stats.maintenanceOpen > 5 ? 'red' : 'gray' },
  ] as const

  return (
    <div className="space-y-6">
      {/* Health score ring */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-4 flex-shrink-0 ${scoreColor}`}>
          {healthScore}%
        </div>
        <div>
          <div className="font-semibold text-gray-900 text-lg">Branch Health Score</div>
          <div className="text-sm text-gray-500">{stats.activeOrgCount} of {stats.orgCount} orgs active</div>
          {pastDueOrgs.length > 0 && (
            <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              {pastDueOrgs.length} org(s) past due — action required
            </div>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {metrics.map(({ label, value, note, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`text-2xl font-bold mb-1 ${
              color === 'green'  ? 'text-green-600'  :
              color === 'red'    ? 'text-red-600'    :
              color === 'amber'  ? 'text-amber-600'  :
              color === 'blue'   ? 'text-blue-600'   :
              color === 'purple' ? 'text-purple-600' : 'text-gray-700'
            }`}>{value}</div>
            <div className="text-xs font-medium text-gray-700">{label}</div>
            <div className="text-xs text-gray-400">{note}</div>
          </div>
        ))}
      </div>

      {/* Inactive orgs detail */}
      {inactiveOrgs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-900">Orgs Needing Attention ({inactiveOrgs.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {inactiveOrgs.map(o => (
              <div key={o.id} className="px-5 py-3 flex items-center justify-between">
                <span className="font-medium text-gray-800 text-sm">{o.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  o.subscription_status === 'past_due' ? 'bg-red-100 text-red-700' :
                  o.canceled_at                        ? 'bg-gray-100 text-gray-500' :
                                                         'bg-yellow-100 text-yellow-700'
                }`}>
                  {o.canceled_at ? 'canceled' : o.subscription_status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Staff / Orgs Tab ─────────────────────────────────────────────────────────

function StaffTab({ orgs }: { orgs: Org[] }) {
  const PLAN_STYLE: Record<string, string> = {
    basic:      'bg-gray-100 text-gray-600',
    pro:        'bg-blue-100 text-blue-700',
    enterprise: 'bg-purple-100 text-purple-700',
  }
  const STATUS_STYLE: Record<string, string> = {
    active:   'bg-green-100 text-green-700',
    trialing: 'bg-blue-100 text-blue-600',
    past_due: 'bg-red-100 text-red-700',
    canceled: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {orgs.length} organisation{orgs.length !== 1 ? 's' : ''} under this branch
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {orgs.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Building2 className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No organisations yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Organisation</th>
                  <th className="px-5 py-3 text-left">Plan</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orgs.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{o.name}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        PLAN_STYLE[o.subscription_plan] ?? 'bg-gray-100 text-gray-600'
                      }`}>
                        {o.subscription_plan ?? 'basic'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        o.canceled_at
                          ? 'bg-gray-100 text-gray-500'
                          : STATUS_STYLE[o.subscription_status] ?? 'bg-gray-100 text-gray-600'
                      }`}>
                        {o.canceled_at ? 'canceled' : o.subscription_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Actions Tab ──────────────────────────────────────────────────────────────

function ActionsTab({ branch, orgCount }: { branch: BranchData; orgCount: number }) {
  const [utilRefresh, setUtilRefresh] = useState(0)

  return (
    <div className="space-y-6 max-w-xl">
      {/* Status controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Branch Controls</h2>
        <p className="text-sm text-gray-500 mb-5">
          Suspended branches lose all superadmin access until reactivated. Archiving is permanent.
        </p>
        <BranchActions
          branchId={branch.id}
          branchName={branch.display_name}
          currentStatus={branch.status}
          orgCount={orgCount}
        />
      </div>

      {/* Branch Limits (Item 123) */}
      {branch.status !== 'archived' && (
        <BranchLimitsPanel branch={branch} onSaved={() => setUtilRefresh(n => n + 1)} />
      )}

      {/* Utilisation Card */}
      <UtilisationCard branchId={branch.id} refreshKey={utilRefresh} />

      {/* Legal Agreement */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Legal Agreement</h2>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Draft, export, and manage the signed franchise agreement between HQ and this branch.
        </p>
        <Link
          href={`/hq/branches/${branch.id}/agreement`}
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <FileText className="h-4 w-4" />
          Open Agreement
        </Link>
      </div>

      {/* Commercial terms (read-only here — edit via BranchFormModal on the list page) */}
      {branch.status !== 'archived' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Commercial Terms</h2>
          <dl className="space-y-3 text-sm mb-4">
            <div className="flex justify-between">
              <dt className="text-gray-500">License Fee / month</dt>
              <dd className="font-semibold text-gray-900 flex items-center gap-1">
                <OmrSymbol size={13} variant="dark" /> {branch.license_fee_omr.toFixed(3)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Revenue Share</dt>
              <dd className="font-semibold text-gray-900">{branch.revenue_share_pct}%</dd>
            </div>
          </dl>
          <a
            href="/hq/branches"
            className="inline-flex items-center gap-1.5 text-sm text-yellow-700 hover:text-yellow-900 font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Go to Branches list → click the ✏ pencil icon on this branch row to edit
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Branch Limits Panel (Item 123) ─────────────────────────────────────────

function BranchLimitsPanel({ branch, onSaved }: { branch: BranchData; onSaved?: () => void }) {
  const [units,   setUnits]   = useState<string>(branch.max_units   != null ? String(branch.max_units)   : '')
  const [staff,   setStaff]   = useState<string>(branch.max_staff   != null ? String(branch.max_staff)   : '')
  const [tenants, setTenants] = useState<string>(branch.max_tenants != null ? String(branch.max_tenants) : '')
  const [orgs,    setOrgs]    = useState<string>(branch.max_orgs    != null ? String(branch.max_orgs)    : '')
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  async function save() {
    setSaving(true); setMsg(null)
    const body: Record<string, number | null> = {
      max_units:   units.trim()   === '' ? null : parseInt(units,   10),
      max_staff:   staff.trim()   === '' ? null : parseInt(staff,   10),
      max_tenants: tenants.trim() === '' ? null : parseInt(tenants, 10),
      max_orgs:    orgs.trim()    === '' ? null : parseInt(orgs,    10),
    }
    const res = await fetch(`/api/hq/branches/${branch.id}/limits`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json()
      setMsg({ ok: false, text: j.error ?? 'Failed to save limits' })
    } else {
      setMsg({ ok: true, text: 'Limits saved' })
      onSaved?.()
      setTimeout(() => setMsg(null), 2500)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <SlidersHorizontal className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Branch Limits</h2>
      </div>
      <p className="text-sm text-gray-400 mb-5">
        Maximum allowable counts for this branch. Leave blank for no limit.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Max Orgs',    value: orgs,    set: setOrgs,    placeholder: 'Unlimited' },
          { label: 'Max Units',   value: units,   set: setUnits,   placeholder: 'Unlimited' },
          { label: 'Max Staff',   value: staff,   set: setStaff,   placeholder: 'Unlimited' },
          { label: 'Max Tenants', value: tenants, set: setTenants, placeholder: 'Unlimited' },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input
              type="number"
              min={0}
              value={value}
              onChange={e => set(e.target.value)}
              placeholder={placeholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <SlidersHorizontal className="w-4 h-4" />}
          Save Limits
        </button>
        {msg && (
          <p className={`text-sm flex items-center gap-1 ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>
            {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {msg.text}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Utilisation Card ─────────────────────────────────────────────────────────

type UtilRow = { current: number; limit: number | null }
type UtilData = { orgs: UtilRow; units: UtilRow; staff: UtilRow; tenants: UtilRow }

function UtilBar({ current, limit }: { current: number; limit: number | null }) {
  if (limit == null) return <span className="text-xs text-gray-400 italic">Unlimited</span>
  const pct = Math.min(100, Math.round((current / limit) * 100))
  const color = pct >= 85 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-green-500'
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{current} / {limit}</span>
        <span className={pct >= 85 ? 'text-red-600 font-semibold' : pct >= 70 ? 'text-amber-600 font-semibold' : 'text-gray-400'}>
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function UtilisationCard({ branchId, refreshKey }: { branchId: string; refreshKey?: number }) {
  const [data,    setData]    = useState<UtilData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/hq/branches/${branchId}/utilisation`)
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d) })
      .finally(() => setLoading(false))
  }, [branchId, refreshKey])

  const rows = data ? [
    { label: 'Organisations', ...data.orgs,    icon: Building2 },
    { label: 'Units',         ...data.units,   icon: Home      },
    { label: 'Staff Members', ...data.staff,   icon: Users     },
    { label: 'Tenants',       ...data.tenants, icon: Users     },
  ] : []

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <BarChart2 className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Branch Utilisation</h2>
      </div>
      <p className="text-sm text-gray-400 mb-5">Current usage vs. branch limits.</p>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(({ label, current, limit }) => (
            <div key={label}>
              <div className="text-xs font-medium text-gray-700 mb-1.5">{label}</div>
              <UtilBar current={current} limit={limit} />
            </div>
          ))}
          {rows.some(r => r.limit != null && r.current / r.limit! >= 0.85) && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              One or more limits are above 85% — consider increasing them.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Audit Tab (Item 124) ─────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; color: string; Icon: React.FC<{ className?: string }> }> = {
  status_change:  { label: 'Status Changed',  color: 'blue',   Icon: ({ className }) => <PauseCircle className={className} /> },
  limits_update:  { label: 'Limits Updated',  color: 'purple', Icon: ({ className }) => <SlidersHorizontal className={className} /> },
  billing_paid:   { label: 'Billing Paid',    color: 'green',  Icon: ({ className }) => <CheckCircle2 className={className} /> },
  billing_remind: { label: 'Reminder Sent',   color: 'amber',  Icon: ({ className }) => <ClipboardList className={className} /> },
  archived:       { label: 'Archived',        color: 'red',    Icon: ({ className }) => <Archive className={className} /> },
}

function auditDescription(log: AuditLog): string {
  const d = log.details ?? {}
  switch (log.action) {
    case 'status_change': {
      const from = String(d.from ?? '?')
      const to   = String(d.to   ?? '?')
      return `Status changed from ${from} → ${to}`
    }
    case 'limits_update': {
      const before = d.before as Record<string, number | null> ?? {}
      const after  = d.after  as Record<string, number | null> ?? {}
      const parts: string[] = []
      for (const k of ['max_units', 'max_staff', 'max_tenants', 'max_orgs']) {
        if (k in after) {
          const label = k.replace('max_', 'Max ').replace('_', ' ')
          const bVal = before[k] != null ? String(before[k]) : 'Unlimited'
          const aVal = after[k]  != null ? String(after[k])  : 'Unlimited'
          parts.push(`${label}: ${bVal} → ${aVal}`)
        }
      }
      return parts.join(' · ') || 'Limits updated'
    }
    case 'billing_paid':   return `Billing marked as paid for ${String(d.month ?? 'unknown month')}`
    case 'billing_remind': return `Payment reminder sent to branch superadmin`
    default: return log.action.replace('_', ' ')
  }
}

function exportAuditCSV(logs: AuditLog[], branchId: string) {
  const rows = [
    ['Date', 'Action', 'Description', 'Actor'],
    ...logs.map(l => [
      new Date(l.created_at).toLocaleString('en-GB'),
      l.action,
      auditDescription(l),
      l.profiles?.full_name ?? l.profiles?.email ?? '—',
    ]),
  ]
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `branch-audit-${branchId}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
}

function AuditTab({ branchId }: { branchId: string }) {
  const [logs,       setLogs]       = useState<AuditLog[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [filterAction, setFilter]  = useState('all')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '200' })
    if (filterAction !== 'all') params.set('action', filterAction)

    fetch(`/api/hq/branches/${branchId}/audit?${params}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setLogs(d)
        else setError(d.error ?? 'Failed to load audit log')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [branchId, filterAction])

  const colorMap: Record<string, string> = {
    blue:   'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    green:  'bg-green-100 text-green-700',
    amber:  'bg-amber-100 text-amber-700',
    red:    'bg-red-100 text-red-700',
    gray:   'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={filterAction}
            onChange={e => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
          >
            <option value="all">All actions</option>
            <option value="status_change">Status changes</option>
            <option value="limits_update">Limits updates</option>
            <option value="billing_paid">Billing paid</option>
            <option value="billing_remind">Reminders sent</option>
          </select>
          <span className="text-xs text-gray-400">{logs.length} event{logs.length !== 1 ? 's' : ''}</span>
        </div>
        <button
          onClick={() => exportAuditCSV(logs, branchId)}
          disabled={logs.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading audit log…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-2 py-16 text-red-500 text-sm">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
            <ClipboardList className="w-10 h-10 opacity-30" />
            <p className="text-sm">No audit events recorded yet</p>
            <p className="text-xs text-gray-300">Events are logged when status or limits change</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map(log => {
              const meta = ACTION_LABELS[log.action] ?? { label: log.action, color: 'gray', Icon: ClipboardList }
              const colorCls = colorMap[meta.color] ?? colorMap.gray
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50">
                  <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${colorCls}`}>
                    <meta.Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{auditDescription(log)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(log.created_at).toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                      {log.profiles?.full_name ? ` · by ${log.profiles.full_name}` : ''}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${colorCls}`}>
                    {meta.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
