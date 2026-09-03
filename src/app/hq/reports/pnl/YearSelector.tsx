'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function YearSelector({ year }: { year: number }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  function go(y: number) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('year', String(y))
    router.push(`${pathname}?${p.toString()}`)
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
      <button
        onClick={() => go(year - 1)}
        className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-semibold text-gray-800 px-2 min-w-[3rem] text-center">{year}</span>
      <button
        onClick={() => go(year + 1)}
        disabled={year >= currentYear}
        className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors disabled:opacity-30"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
