'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings2, Loader2, X } from 'lucide-react'

export default function ChangeSubscriptionForm({
  orgId, currentPlan, currentStatus
}: { orgId: string; currentPlan: string; currentStatus: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(currentPlan)
  const [status, setStatus] = useState(currentStatus)
  const [maxUnits, setMaxUnits] = useState('')
  const [maxTenants, setMaxTenants] = useState('')
  const router = useRouter()

  async function handleSave() {
    setLoading(true)
    await fetch('/api/admin/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, plan, status, maxUnits, maxTenants }),
    })
    setOpen(false)
    router.refresh()
    setLoading(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5">
      <Settings2 size={13} /> Manage
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Manage Subscription</h2>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><label className="label">Plan</label>
            <select className="input" value={plan} onChange={e => setPlan(e.target.value)}>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div><label className="label">Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="trialing">Trialing</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Max Units</label><input className="input" type="number" placeholder="e.g. 50" value={maxUnits} onChange={e => setMaxUnits(e.target.value)} /></div>
            <div><label className="label">Max Tenants</label><input className="input" type="number" placeholder="e.g. 75" value={maxTenants} onChange={e => setMaxTenants(e.target.value)} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
