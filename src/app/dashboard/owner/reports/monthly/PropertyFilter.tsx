'use client'
import { useRouter } from 'next/navigation'

type Prop = { id: string; name: string }

export default function PropertyFilter({
  properties,
  selected,
  month,
}: {
  properties: Prop[]
  selected: string
  month: string
}) {
  const router = useRouter()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    const params = new URLSearchParams()
    params.set('month', month)
    if (val) params.set('property', val)
    router.push(`/dashboard/owner/reports/monthly?${params.toString()}`)
  }

  if (properties.length <= 1) return null

  return (
    <select
      value={selected}
      onChange={onChange}
      className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-500 shadow-sm"
    >
      <option value="">All Properties</option>
      {properties.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  )
}
