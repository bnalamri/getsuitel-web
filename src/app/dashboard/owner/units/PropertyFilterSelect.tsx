'use client'
import { useRouter } from 'next/navigation'

export default function PropertyFilterSelect({
  properties,
  selected,
  basePath = '/dashboard/owner/units',
}: {
  properties: { id: string; name: string }[]
  selected?: string
  basePath?: string
}) {
  const router = useRouter()
  if (properties.length <= 1) return null
  return (
    <select
      className="input text-sm"
      value={selected ?? ''}
      onChange={e => {
        const v = e.target.value
        router.push(v ? `${basePath}?property=${v}` : basePath)
      }}
    >
      <option value="">All Properties</option>
      {properties.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  )
}
