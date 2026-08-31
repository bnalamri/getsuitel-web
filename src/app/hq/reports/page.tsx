import Link from 'next/link'
import { Building2, Users, Wrench, TrendingUp, CreditCard, BarChart2 } from 'lucide-react'

const REPORTS = [
  { href: '/hq/reports/properties',     icon: Building2,  label: 'Properties',             desc: 'All properties across branches — filter by branch, type, status' },
  { href: '/hq/reports/tenants',        icon: Users,      label: 'Tenants',                 desc: 'All tenants + contract status, filterable by branch' },
  { href: '/hq/reports/maintenance',    icon: Wrench,     label: 'Maintenance',             desc: 'Open / closed jobs per branch — highlights overdue' },
  { href: '/hq/reports/revenue-trend',  icon: TrendingUp, label: 'Revenue Trend',           desc: 'Monthly revenue per branch over the last 12 months' },
  { href: '/hq/reports/subscriptions',  icon: CreditCard, label: 'Subscription Plans',      desc: 'Organisations per plan tier, grouped by branch' },
  { href: '/hq/reports/growth',         icon: BarChart2,  label: 'Growth Metrics',          desc: 'Branch growth — new orgs, properties, tenants over time' },
]

export default function HQReportsPage() {
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
