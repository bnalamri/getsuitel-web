import Link from 'next/link'
import { ShieldOff } from 'lucide-react'

export const metadata = { title: 'Branch Suspended — GetSuitel' }

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
          <ShieldOff size={28} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Branch Suspended</h1>
        <p className="text-slate-500 mb-6 leading-relaxed">
          Your branch has been suspended by GetSuitel HQ. Access to the platform is temporarily restricted.
          Please contact your HQ administrator to resolve this.
        </p>
        <div className="bg-slate-100 rounded-xl px-5 py-4 text-sm text-slate-600 mb-8">
          <p className="font-medium text-slate-700 mb-1">Need help?</p>
          <p>Contact HQ at <a href="mailto:hq_admin@getsuitel.com" className="text-navy-700 font-semibold hover:underline">hq_admin@getsuitel.com</a></p>
        </div>
        <Link
          href="/auth/logout"
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Sign out
        </Link>
      </div>
    </div>
  )
}
