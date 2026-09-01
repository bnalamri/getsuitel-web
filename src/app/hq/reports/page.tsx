import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, Users, Wrench, TrendingUp, CreditCard, BarChart2 } from 'lucide-react'

const ALL_REPORTS = [
  { href: '/hq/reports/properties',     icon: Building2,  label: 'Properties',             desc: 'All properties across branches — filter by branch, type, status', financeOnly: false },
  { href: '/hq/reports/tenants',        icon: Users,      label: 'Tenants',                 desc: 'All tenants + contract status, filterable by branch', financeOnly: false },
  { href: '/hq/reports/maintenance',    icon: Wrench,     label: 'Maintenance',             desc: 'Open / closed jobs per branch — highlights overdue', financeOnly: false },
  { href: '/hq/reports/revenue-trend',  icon: TrendingUp, label: 'Revenue Trend',           desc: 'Monthly revenue per branch over the last 12 months', financeOnly: true },
  { href: '/hq/reports/subscriptions',  icon: CreditCard, label: 'Subscription Plans',      desc: 'Organisations per plan tier, grouped by branch', financeOnly: false },
  { href: '/hq/reports/growth',         icon: BarChart2,  label: 'Growth Metrics',          desc: 'Branch growth — new orgs, properties, tenants over time', financeOnly: false },
]

const FINANCE_ROLES = ['hq_admin', 'hq_finance']

export default async function HQReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isFinance = FINANCE_ROLES.includes(profile?.role ?? '')
  const REPORTS = ALL_REPORTS.filter(r => !r.financeOnly || isFinance)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Cross-branch analytics for HQ management</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map(r => (
          <Link
            key={r.href}
            href={r.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-yellow-400 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mb-3 group-hover:bg-yellow-200 transition-colors">
              <r.icon className="w-5 h-5 text-yellow-700" />
            </div>
            <p className="font-semibold text-gray-900">{r.label}</p>
            <p className="text-sm text-gray-500 mt-1">{r.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
