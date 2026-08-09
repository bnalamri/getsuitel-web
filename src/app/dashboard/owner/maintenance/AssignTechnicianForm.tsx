'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, CalendarDays } from 'lucide-react'

type Tech = { id: string; full_name: string }

function formatDate(isoDate: string, fmt: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  if (fmt.toUpperCase().startsWith('MM')) return `${mm}/${dd}/${yyyy}`
  if (fmt.toUpperCase().startsWith('YYYY')) return `${yyyy}/${mm}/${dd}`
  return `${dd}/${mm}/${yyyy}` // DD/MM/YYYY default
}

export default function AssignTechnicianForm({
  requestId, currentTechId, technicians, currentChargePayer, currentChargeAmount, dateFormat,
}: {
  requestId: string
  currentTechId: string | null
  technicians: Tech[]
  currentChargePayer?: string | null
  currentChargeAmount?: number | null
  dateFormat?: string
}) {
  const [expanded, setExpanded] = useState(!currentTechId)
  const [techId, setTechId] = useState(currentTechId ?? '')
  const [chargePayer, setChargePayer] = useState(currentChargePayer ?? 'none')
  const [chargeAmount, setChargeAmount] = useState(
    currentChargeAmount != null ? String(currentChargeAmount) : ''
  )
  const [scheduledDate, setScheduledDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const datePickerRef = useRef<HTMLInputElement>(null)
  const fmt = dateFormat ?? 'DD/MM/YYYY'
  const router = useRouter()

  // Collapsed view — assigned tech + Reassign button
  if (!expanded) {
    const assignedTech = technicians.find(t => t.id === techId)
    return (
      <div className="space-y-1.5 min-w-[160px]">
        <div className="text-xs font-semibold text-slate-700 truncate">
          {assignedTech?.full_name ?? 'Assigned'}
        </div>
        {currentChargePayer && currentChargePayer !== 'none' && currentChargeAmount != null && (
          <div className="text-xs text-slate-400">
            OMR {Number(currentChargeAmount).toFixed(3)} · {currentChargePayer}
          </div>
        )}
        <button
          onClick={() => setExpanded(true)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 w-full text-center"
        >
          Reassign
        </button>
      </div>
    )
  }

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
        scheduledDate: techId && scheduledDate ? scheduledDate : null,
      }),
    })
    setLoading(false)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      if (techId) setExpanded(false)
    }, 1200)
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

          {/* Scheduled date — custom display so placeholder matches org date format */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Schedule date (optional)</label>
            <div className="relative">
              {/* Visible text input showing date in org format */}
              <input
                type="text"
                readOnly
                value={scheduledDate ? formatDate(scheduledDate, fmt) : ''}
                placeholder={fmt}
                onClick={() => datePickerRef.current?.showPicker?.()}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 pr-7 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-full cursor-pointer"
              />
              <CalendarDays
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              {/* Hidden native date picker */}
              <input
                ref={datePickerRef}
                type="date"
                value={scheduledDate}
                onChange={e => { setScheduledDate(e.target.value); setSaved(false) }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                tabIndex={-1}
              />
            </div>
          </div>
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
