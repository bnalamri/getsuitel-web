import { Globe, Info } from 'lucide-react'

export default function PlatformInfoCard() {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Info size={16} className="text-orange-700" />
        <h3 className="font-semibold text-slate-900">Platform & Info</h3>
      </div>
      <div className="space-y-3">
        <a href="https://getsuitel.com" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-orange-300 hover:bg-orange-50 transition-colors group">
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-orange-700" />
            <span className="text-sm font-medium text-slate-700">GetSuitel Website</span>
          </div>
          <span className="text-xs text-slate-400 group-hover:text-orange-600">getsuitel.com ↗</span>
        </a>
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-sm text-slate-500">Role</span>
          <span className="text-sm font-medium text-slate-700">Technician</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-sm text-slate-500">Powered by</span>
          <span className="text-sm font-medium text-slate-700">GetSuitel Platform</span>
        </div>
      </div>
    </div>
  )
}
