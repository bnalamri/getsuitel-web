'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function MonthPicker({ month }: { month: string }) {
  const router = useRouter()

  function navigate(delta: number) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const next = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    router.push(`/dashboard/owner/reports/monthly?month=${next}`)
  }

  const label = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const now = new Date()
  const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  const isCurrentMonth = month === currentMonth

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(-1)}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-base font-semibold text-slate-800 min-w-[140px] text-center">
        {label}
      </span>
      <button
        onClick={() => navigate(1)}
        disabled={isCurrentMonth}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next month"
      >
        <ChevronRight size={18} />
      </button>
      {!isCurrentMonth && (
        <button
          onClick={() => router.push(`/dashboard/owner/reports/monthly?month=${currentMonth}`)}
          className="ml-1 text-xs text-navy-700 hover:underline font-medium"
        >
          Today
        </button>
      )}
    </div>
  )
}
