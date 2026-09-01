'use client'
import { useRouter, useSearchParams } from 'next/navigation'

const STATUSES = [
  { value: '',            label: 'All Status' },
  { value: 'open',       label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',  label: 'Completed' },
  { value: 'canceled',   label: 'Canceled' },
]

export default function StatusFilterSelect({
  selected, basePath,
}: { selected: string | null; basePath: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(status: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (status) params.set('status', status)
    else params.delete('status')
    const qs = params.toString()
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  return (
    <select
      value={selected ?? ''}
      onChange={e => handleChange(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
    >
      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  )
}
