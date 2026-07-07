'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2 } from 'lucide-react'

type Unit = {
  id: string
  unit_number: string
  floor: number | null
  area_sqm: number | null
  bedrooms: number | null
  bathrooms: number | null
  rent_amount: number
  currency: string
  status: string
}

export default function EditUnitForm({ unit, occupied }: { unit: Unit; occupied: boolean }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    unit_number: unit.unit_number,
    floor: unit.floor?.toString() ?? '',
    area_sqm: unit.area_sqm?.toString() ?? '',
    bedrooms: unit.bedrooms?.toString() ?? '',
    bathrooms: unit.bathrooms?.toString() ?? '',
    rent_amount: unit.rent_amount?.toString() ?? '',
    currency: unit.currency ?? 'OMR',
    status: unit.status ?? 'vacant',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/units', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: unit.id,
        unit_number: form.unit_number,
        floor: form.floor ? Number(form.floor) : null,
        area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        rent_amount: form.rent_amount,
        currency: form.currency,
        status: form.status,
        occupied,
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to update unit'); return }
    setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="p-1.5 text-slate-400 hover:text-navy-700 hover:bg-navy-50 rounded-lg transition-colors" title="Edit unit">
      <Pencil size={14} />
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-slate-900">Edit Unit {unit.unit_number}</h2>
            {occupied && <p className="text-xs text-amber-600 mt-0.5">Unit is occupied — rent amount is locked</p>}
          </div>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unit Number</label>
              <input className="input" required value={form.unit_number} onChange={e => setForm(f => ({ ...f, unit_number: e.target.value }))} />
            </div>
            <div>
              <label className="label">Floor</label>
              <input className="input" type="number" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} placeholder="1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Area (m²)</label>
              <input className="input" type="number" value={form.area_sqm} onChange={e => setForm(f => ({ ...f, area_sqm: e.target.value }))} />
            </div>
            <div>
              <label className="label">Bedrooms</label>
              <input className="input" type="number" value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))} />
            </div>
            <div>
              <label className="label">Bathrooms</label>
              <input className="input" type="number" value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rent Amount</label>
              <input
                className={`input ${occupied ? 'bg-slate-100 cursor-not-allowed text-slate-400' : ''}`}
                type="number"
                value={form.rent_amount}
                onChange={e => !occupied && setForm(f => ({ ...f, rent_amount: e.target.value }))}
                readOnly={occupied}
                title={occupied ? 'Rent cannot be changed while unit is occupied' : ''}
              />
              {occupied && <p className="text-xs text-amber-600 mt-1">Locked — active contract exists</p>}
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option>OMR</option><option>USD</option><option>AED</option><option>SAR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Under Maintenance</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
