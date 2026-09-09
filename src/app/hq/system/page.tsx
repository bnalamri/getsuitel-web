import Link from 'next/link'
import { ToggleRight } from 'lucide-react'

const TOOLS = [
  { href: '/hq/system/feature-flags', icon: ToggleRight, label: 'Feature Flags', desc: 'Turn platform features on or off globally, or override per branch' },
]

export default function HQSystemPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform-wide controls and tools</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-yellow-400 hover:shadow-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mb-3 group-hover:bg-yellow-200 transition-colors">
              <t.icon className="w-5 h-5 text-yellow-700" />
            </div>
            <p className="font-semibold text-gray-900">{t.label}</p>
            <p className="text-sm text-gray-500 mt-1">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
