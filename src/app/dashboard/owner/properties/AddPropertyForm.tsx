'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2 } from 'lucide-react'

export default function AddPropertyForm({ orgId, inline }: { orgId: string; inline?: boolean }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const [form, setForm] = useState({ name: '', type: 'residential', address: '', city: '', country: 'Oman' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('properties').insert({ ...form, organization_id: orgId })
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false)
    setForm({ name: '', type: 'residential', address: '', city: '', country: 'Oman' })
    router.refresh()
    setLoading(false)
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
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Property Name</label>
            <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Al Noor Tower" />
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
            <label className="label">Address</label>
            <input className="input" required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" />
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
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
