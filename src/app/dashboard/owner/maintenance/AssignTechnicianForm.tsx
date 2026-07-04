'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'

type Tech = { id: string; full_name: string }

export default function AssignTechnicianForm({
  requestId, currentTechId, technicians, currentChargePayer, currentChargeAmount,
}: {
  requestId: string
  currentTechId: string | null
  technicians: Tech[]
  currentChargePayer?: string | null
  currentChargeAmount?: number | null
}) {
  const [techId, setTechId] = useState(currentTechId ?? '')
  const [chargePayer, setChargePayer] = useState(currentChargePayer ?? 'none')
  const [chargeAmount, setChargeAmount] = useState(
    currentChargeAmount != null ? String(currentChargeAmount) : ''
  )
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  async function save() {
    setLoading(true)
    await fetch('/api/maintenance/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        technicianId: techId || null,
        chargePayer: techId ? (chargePayer || 'none') : null,
        chargeAmount: (techId && chargePayer !== 'none' && chargeAmount)
          ? parseFloat(chargeAmount) : null,
      }),
    })
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  if (technicians.length === 0) {
    return <span className="text-slate-300 text-xs">No technicians</span>
  }

  const showChargeFields = !!techId
  const showAmountInput = chargePayer === 'owner' || chargePayer === 'tenant'

  return (
    <div className="space-y-2 min-w-[160px]">
      {/* Technician selector */}
      <select
        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-full"
        value={techId}
        onChange={e => { setTechId(e.target.value); setSaved(false) }}
      >
        <option value="">— Unassigned —</option>
        {technicians.map(t => (
          <option key={t.id} value={t.id}>{t.full_name}</option>
        ))}
      </select>

      {/* Charge fields — shown when a technician is selected */}
      {showChargeFields && (
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <select
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-full"
            value={chargePayer}
            onChange={e => { setChargePayer(e.target.value); setSaved(false) }}
          >
            <option value="none">No charge</option>
            <option value="owner">Owner pays</option>
            <option value="tenant">Tenant pays</option>
          </select>

          {showAmountInput && (
            <input
              type="number"
              placeholder="Est. amount (OMR)"
              value={chargeAmount}
              onChange={e => { setChargeAmount(e.target.value); setSaved(false) }}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-full"
              min="0"
              step="0.001"
            />
          )}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={save}
        disabled={loading || saved}
        className="text-xs bg-[#1B3A6B] text-white rounded-lg px-2.5 py-1.5 hover:bg-[#162f59] disabled:opacity-50 flex items-center justify-center gap-1 w-full"
      >
        {loading
          ? <Loader2 size={11} className="animate-spin" />
          : saved
            ? <><Check size={11} /> Saved</>
            : 'Save'}
      </button>
    </div>
  )
}
