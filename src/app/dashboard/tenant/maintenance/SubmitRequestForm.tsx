'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2 } from 'lucide-react'

export default function SubmitRequestForm({
  tenantId, orgId, unitId, unitNumber
}: { tenantId: string; orgId: string; unitId: string; unitNumber: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const [form, setForm] = useState({ title: '', description: '', category: 'other', priority: 'medium' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('maintenance_requests').insert({
      organization_id: orgId,
      unit_id: unitId,
      tenant_id: tenantId,
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
      status: 'open',
    })
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false)
    setForm({ title: '', description: '', category: 'other', priority: 'medium' })
    router.refresh()
    setLoading(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
      <Plus size={16} /> New Request
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900">Submit Maintenance Request</h2>
            <p className="text-xs text-slate-400 mt-0.5">Unit {unitNumber}</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div><label className="label">Title</label><input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Leaking tap in kitchen" /></div>
          <div><label className="label">Description</label><textarea className="input" rows={3} required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue in detail..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {['plumbing','electrical','hvac','structural','appliance','cleaning','other'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div><label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="low">Low</option><option value="medium">Medium</option>
                <option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
