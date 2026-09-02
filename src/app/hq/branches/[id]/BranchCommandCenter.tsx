'use client'
import { useState } from 'react'
import {
  Building2, Users, Home, TrendingUp, AlertTriangle,
  Activity, DollarSign, ShieldAlert, Settings2, FileText,
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

type Props = {
  branch:  BranchData
  profile: Profile
  stats:   Stats
  orgs:    Org[]
  billing: BillingRow[]
}

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',  label: 'Overview',  icon: Activity   },
  { key: 'financial', label: 'Financial', icon: DollarSign },
  { key: 'health',    label: 'Health',    icon: ShieldAlert },
  { key: 'staff',     label: 'Orgs',      icon: Building2  },
  { key: 'actions',   label: 'Actions',   icon: Settings2  },
] as const

type Tab = typeof TABS[number]['key']

// ─── Root Component ───────────────────────────────────────────────────────────

export default function BranchCommandCenter({ branch, profile, stats, orgs, billing }: Props) {
  const [tab, setTab] = useState<Tab>('overview')

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
          <p className="text-xs text-gray-400">
            To update commercial terms, use the ✏️ Edit button on the Branches list page.
          </p>
        </div>
      )}
    </div>
  )
}
