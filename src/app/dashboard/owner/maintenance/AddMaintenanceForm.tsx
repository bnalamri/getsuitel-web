'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2 } from 'lucide-react'

type Unit = { id: string; unit_number: string; properties: { name: string } | null }
type Tech = { id: string; full_name: string }

export default function AddMaintenanceForm({ orgId, units, technicians }: { orgId: string; units: Unit[]; technicians: Tech[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const [form, setForm] = useState({
    unit_id: units[0]?.id ?? '', title: '', description: '',
    category: 'other', priority: 'medium', technician_id: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('maintenance_requests').insert({
      organization_id: orgId,
      unit_id: form.unit_id,
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
      technician_id: form.technician_id || null,
      status: form.technician_id ? 'assigned' : 'open',
    })
    if (err) { setError(err.message); setLoading(false); return }
    setOpen(false)
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-900">New Maintenance Request</h2>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div><label className="label">Unit</label>
            <select className="input" required value={form.unit_id} onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}>
              {units.map(u => <option key={u.id} value={u.id}>{u.properties?.name} — Unit {u.unit_number}</option>)}
            </select>
          </div>
          <div><label className="label">Title</label><input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Leaking pipe in kitchen" /></div>
          <div><label className="label">Description</label><textarea className="input" rows={3} required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
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
          {technicians.length > 0 && (
            <div><label className="label">Assign Technician (optional)</label>
              <select className="input" value={form.technician_id} onChange={e => setForm(f => ({ ...f, technician_id: e.target.value }))}>
                <option value="">— Unassigned —</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
          )}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
