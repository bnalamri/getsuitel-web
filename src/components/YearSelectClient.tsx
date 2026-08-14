'use client'
import { useRef } from 'react'

export default function YearSelectClient({ year, availableYears }: { year: number; availableYears: number[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <form ref={formRef} method="GET">
      <select
        name="year"
        defaultValue={year}
        onChange={() => formRef.current?.submit()}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
      >
        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </form>
  )
}
