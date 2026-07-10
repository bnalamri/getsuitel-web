'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserCheck, X, Loader2 } from 'lucide-react'
import PhoneInput from '@/components/PhoneInput'

type PendingProfile = {
  id: string
  full_name: string
  email: string
  phone: string | null
}

export default function AcceptMemberButton({ profile }: { profile: PendingProfile }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [form, setForm] = useState({
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone ?? '',
    nationality: '',
    national_id: '',
    emergency_contact: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, profile_id: profile.id }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Failed to add tenant'); return }
    setOpen(false)
    router.refresh()
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 btn-primary text-xs px-3 py-1.5"
    >
      <UserCheck size={13} /> Add as Tenant
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-slate-900">Add as Tenant</h2>
            <p className="text-xs text-slate-500 mt-0.5">Pre-filled from registration — complete any missing fields</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-slate-50 cursor-not-allowed" type="email" value={form.email} readOnly />
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
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm & Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
