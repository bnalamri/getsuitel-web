'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'

type Tech = { id: string; full_name: string }

export default function AssignTechnicianForm({
  requestId, currentTechId, technicians,
}: { requestId: string; currentTechId: string | null; technicians: Tech[] }) {
  const [techId, setTechId] = useState(currentTechId ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const changed = techId !== (currentTechId ?? '')

  async function save() {
    setLoading(true)
    await fetch('/api/maintenance/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, technicianId: techId }),
    })
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  if (technicians.length === 0) {
    return <span className="text-slate-300 text-xs">No technicians</span>
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 max-w-[150px]"
        value={techId}
        onChange={e => { setTechId(e.target.value); setSaved(false) }}
      >
        <option value="">— Unassigned —</option>
        {technicians.map(t => (
          <option key={t.id} value={t.id}>{t.full_name}</option>
        ))}
      </select>
      {changed && (
        <button
          onClick={save}
          disabled={loading}
          className="text-xs bg-[#1B3A6B] text-white rounded-lg px-2.5 py-1.5 hover:bg-[#162f59] disabled:opacity-50 flex items-center"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
        </button>
      )}
      {saved && !changed && <Check size={14} className="text-green-500" />}
    </div>
  )
}
