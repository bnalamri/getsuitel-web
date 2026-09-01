'use client'
import { useRouter, useSearchParams } from 'next/navigation'

type Branch = { id: string; display_name: string }

export default function BranchFilterSelect({
  branches, selected, basePath,
}: { branches: Branch[]; selected: string | null; basePath: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(branch: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (branch) params.set('branch', branch)
    else params.delete('branch')
    const qs = params.toString()
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  return (
    <select
      value={selected ?? ''}
      onChange={e => handleChange(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
    >
      <option value="">All Branches</option>
      {branches.map(b => <option key={b.id} value={b.id}>{b.display_name}</option>)}
    </select>
  )
}
