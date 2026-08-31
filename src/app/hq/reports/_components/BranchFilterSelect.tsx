'use client'
import { useRouter } from 'next/navigation'

type Branch = { id: string; display_name: string }

export default function BranchFilterSelect({
  branches, selected, basePath,
}: { branches: Branch[]; selected: string | null; basePath: string }) {
  const router = useRouter()
  return (
    <select
      value={selected ?? ''}
      onChange={e => router.push(e.target.value ? `${basePath}?branch=${e.target.value}` : basePath)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
    >
      <option value="">All Branches</option>
      {branches.map(b => <option key={b.id} value={b.id}>{b.display_name}</option>)}
    </select>
  )
}
