'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2 } from 'lucide-react'
import PhoneInput from '@/components/PhoneInput'

type Tenant = {
  id: string
  full_name: string
  email: string
  phone: string
  nationality: string | null
  national_id: string | null
  emergency_contact: string | null
}

export default function EditTenantForm({ tenant }: { tenant: Tenant }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    full_name: tenant.full_name,
    email: tenant.email,
    phone: tenant.phone ?? '',
    nationality: tenant.nationality ?? '',
    national_id: tenant.national_id ?? '',
    emergency_contact: tenant.emergency_contact ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tenant.id, ...form }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to update tenant'); return }
    setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="p-1.5 text-slate-400 hover:text-navy-700 hover:bg-navy-50 rounded-lg transition-colors"
      title="Edit tenant"
    >
      <Pencil size={14} />
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-900">Edit Tenant</h2>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Phone</label>
            <PhoneInput value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nationality</label>
              <input className="input" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="Omani" />
            </div>
            <div>
              <label className="label">National ID</label>
              <input className="input" value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Emergency Contact</label>
            <PhoneInput value={form.emergency_contact} onChange={v => setForm(f => ({ ...f, emergency_contact: v }))} placeholder="5XXXXXXXX" />
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
