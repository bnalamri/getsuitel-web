import Link from 'next/link'
import { ToggleRight } from 'lucide-react'

const TOOLS = [
  { href: '/dashboard/owner/system/feature-flags', icon: ToggleRight, label: 'Feature Flags', desc: 'Turn features on or off for your tenants' },
]

export default function OwnerSystemPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System</h1>
        <p className="text-sm text-slate-500 mt-0.5">Account-wide controls and tools</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {TOOLS.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className="card p-5 hover:border-navy-400 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center mb-3 group-hover:bg-navy-100 transition-colors">
              <t.icon className="w-5 h-5 text-navy-700" />
            </div>
            <p className="font-semibold text-slate-900">{t.label}</p>
            <p className="text-sm text-slate-500 mt-1">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
