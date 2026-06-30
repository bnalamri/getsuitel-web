'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2 } from 'lucide-react'

export default function AddTenantForm({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', nationality: '', national_id: '', emergency_contact: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('tenants').insert({ ...form, organization_id: orgId })
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false)
    setForm({ full_name: '', email: '', phone: '', nationality: '', national_id: '', emergency_contact: '' })
    router.refresh()
    setLoading(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
      <Plus size={16} /> Add Tenant
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-900">Add Tenant</h2>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div><label className="label">Full Name</label><input className="input" required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ahmed Al-Rashid" /></div>
          <div><label className="label">Email</label><input className="input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ahmed@email.com" /></div>
          <div><label className="label">Phone</label><input className="input" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+968 9000 0000" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Nationality</label><input className="input" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="Omani" /></div>
            <div><label className="label">National ID</label><input className="input" value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} /></div>
          </div>
          <div><label className="label">Emergency Contact</label><input className="input" value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} placeholder="+968 9000 0001" /></div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Add Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
