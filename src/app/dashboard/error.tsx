'use client'
import { useEffect } from 'react'

export default function DashboardError({
  error, reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error('Dashboard error:', error) }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-xl border border-red-200 p-8 text-center">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Dashboard Error</h2>
        <p className="text-slate-500 text-sm mb-4">Something went wrong loading the dashboard.</p>
        <div className="bg-red-50 rounded-lg p-3 text-left mb-6">
          <code className="text-red-700 text-xs break-all">{error.message}</code>
        </div>
        <button onClick={reset}
          className="px-4 py-2 bg-navy-700 text-white rounded-lg text-sm font-semibold hover:bg-navy-800">
          Try again
        </button>
      </div>
    </div>
  )
}
