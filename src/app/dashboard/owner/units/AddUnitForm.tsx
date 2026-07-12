'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2 } from 'lucide-react'
import { getDemoState, DEMO_UNIT_DATA } from '@/lib/demo/config'

const CURRENCIES = [
  { value: 'OMR', label: 'OMR — Omani Rial' },
  { value: 'SAR', label: 'SAR — Saudi Riyal' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'KWD', label: 'KWD — Kuwaiti Dinar' },
  { value: 'QAR', label: 'QAR — Qatari Riyal' },
  { value: 'BHD', label: 'BHD — Bahraini Dinar' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'EUR', label: 'EUR — Euro' },
]

export default function AddUnitForm({ orgId, properties, defaultPropertyId, defaultCurrency = 'OMR' }: {
  orgId: string
  properties: { id: string; name: string }[]
  defaultPropertyId?: string
  defaultCurrency?: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const initialForm = {
    property_id: defaultPropertyId ?? properties[0]?.id ?? '',
    unit_type: 'flat', unit_number: '', floor: '', area_sqm: '', bedrooms: '', bathrooms: '',
    rent_amount: '', currency: defaultCurrency, status: 'vacant',
  }
  const [form, setForm] = useState(initialForm)
  const submitBtnRef = useRef<HTMLButtonElement>(null)

  // Demo mode: auto-open and auto-fill when step === 2
  useEffect(() => {
    const state = getDemoState()
    if (state.step !== 2) return
    setOpen(true)
    setForm(f => ({
      ...f,
      property_id: defaultPropertyId ?? properties[0]?.id ?? '',
      ...DEMO_UNIT_DATA,
    }))
  }, [defaultPropertyId, properties])

  // Demo mode: listen for submit trigger
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.step !== 2) return
      submitBtnRef.current?.click()
    }
    window.addEventListener('demo:next', handler)
    return () => window.removeEventListener('demo:next', handler)
  }, [])

  function closeAndReset() { setForm(initialForm); setError(''); setOpen(false) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: form.property_id,
        unit_type: form.unit_type,
        unit_number: form.unit_number,
        floor: form.floor ? Number(form.floor) : null,
        area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        rent_amount: Number(form.rent_amount),
        currency: form.currency,
        status: form.status,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to add unit'); setLoading(false); return }
    closeAndReset()
    router.refresh()
    setLoading(false)
    // Demo: signal tour panel
    const demoState = getDemoState()
    if (demoState.step === 2 && json.id) {
      window.dispatchEvent(new CustomEvent('demo:done', { detail: { unitId: json.id } }))
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
      <Plus size={16} /> Add Unit
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-900">Add Unit</h2>
          <button onClick={() => closeAndReset()} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Property</label>
            <select className="input" value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Unit Type</label>
            <select className="input" value={form.unit_type} onChange={e => setForm(f => ({ ...f, unit_type: e.target.value }))}>
              <option value="flat">Flat / Apartment</option>
              <option value="room">Room</option>
              <option value="studio">Studio</option>
              <option value="villa">Villa</option>
              <option value="office">Office</option>
              <option value="shop">Shop</option>
              <option value="warehouse">Warehouse</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unit Number</label>
              <input className="input" required value={form.unit_number} onChange={e => setForm(f => ({ ...f, unit_number: e.target.value }))} placeholder="101" />
            </div>
            <div>
              <label className="label">Floor</label>
              <input className="input" type="number" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} placeholder="1" />
            </div>
          </div>
          {form.unit_type !== 'room' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Area (m²)</label>
                <input className="input" type="number" value={form.area_sqm} onChange={e => setForm(f => ({ ...f, area_sqm: e.target.value }))} placeholder="85" />
              </div>
              <div>
                <label className="label">Bedrooms</label>
                <input className="input" type="number" value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))} placeholder="2" />
              </div>
              <div>
                <label className="label">Bathrooms</label>
                <input className="input" type="number" value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} placeholder="1" />
              </div>
            </div>
          )}
          {form.unit_type === 'room' && (
            <div>
              <label className="label">Area (m²) <span className="text-slate-400 font-normal text-xs">(optional)</span></label>
              <input className="input" type="number" value={form.area_sqm} onChange={e => setForm(f => ({ ...f, area_sqm: e.target.value }))} placeholder="20" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rent Amount</label>
              <input className="input" type="number" required value={form.rent_amount} onChange={e => setForm(f => ({ ...f, rent_amount: e.target.value }))} placeholder="500" />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
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
            <button type="button" onClick={() => closeAndReset()} className="btn-secondary flex-1">Cancel</button>
            <button ref={submitBtnRef} type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Add Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
