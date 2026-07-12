'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2 } from 'lucide-react'
import { getDemoState, DEMO_PROPERTY_DATA } from '@/lib/demo/config'

export default function AddPropertyForm({ orgId, inline }: { orgId: string; inline?: boolean }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const initialForm = { name: '', type: 'residential', address: '', address_line2: '', city: '', country: 'Oman' }
  const [form, setForm] = useState(initialForm)
  const submitBtnRef = useRef<HTMLButtonElement>(null)

  // Demo mode: auto-open and auto-fill when step === 1
  useEffect(() => {
    const state = getDemoState()
    if (state.step !== 1) return
    setOpen(true)
    setForm({ ...initialForm, ...DEMO_PROPERTY_DATA })
  }, [])

  // Demo mode: listen for submit trigger from tour panel
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.step !== 1) return
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
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Failed to add property'); setLoading(false); return }
    closeAndReset()
    router.refresh()
    setLoading(false)
    // Demo: signal tour panel with new propertyId
    const demoState = getDemoState()
    if (demoState.step === 1 && json.id) {
      window.dispatchEvent(new CustomEvent('demo:done', { detail: { propertyId: json.id } }))
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={inline ? 'btn-primary' : 'btn-primary flex items-center gap-2'}>
        <Plus size={16} /> Add Property
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Add Property</h2>
          <button onClick={() => closeAndReset()} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Property Name</label>
            <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Oakwood Tower" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className="label">Address Line 1</label>
            <input className="input" required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Building / Street name" />
          </div>
          <div>
            <label className="label">Address Line 2 <span className="text-slate-400 font-normal text-xs">(optional)</span></label>
            <input className="input" value={form.address_line2} onChange={e => setForm(f => ({ ...f, address_line2: e.target.value }))} placeholder="District / Landmark" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Muscat" />
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input" required value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
            </div>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => closeAndReset()} className="btn-secondary flex-1">Cancel</button>
            <button ref={submitBtnRef} type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
