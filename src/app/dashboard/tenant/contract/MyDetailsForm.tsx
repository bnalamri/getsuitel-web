'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Pencil, Save, X, Loader2, Copy, Check } from 'lucide-react'

export default function MyDetailsForm({ tenant }: { tenant: Record<string, unknown> | null }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied,  setCopied]  = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    full_name:         (tenant?.full_name as string)         ?? '',
    phone:             (tenant?.phone as string)             ?? '',
    emergency_contact: (tenant?.emergency_contact as string) ?? '',
  })

  function copyId() {
    if (!tenant?.national_id) return
    navigator.clipboard.writeText(tenant.national_id as string)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function save() {
    if (!tenant?.id) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('tenants').update({
      full_name:         form.full_name,
      phone:             form.phone,
      emergency_contact: form.emergency_contact,
    }).eq('id', tenant.id as string)
    router.refresh()
    setEditing(false)
    setLoading(false)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">My Details</h3>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-navy-700 hover:underline">
            <Pencil size={12} /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs text-slate-500 hover:underline">
              <X size={12} /> Cancel
            </button>
            <button onClick={save} disabled={loading} className="flex items-center gap-1 text-xs text-navy-700 font-semibold hover:underline">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+968 XXXX XXXX" />
          </div>
          <div>
            <label className="label">Emergency Contact</label>
            <input className="input" value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} placeholder="Name or phone number" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Full Name</div>
            <div className="font-semibold text-slate-900 mt-0.5">{tenant?.full_name ?? '—'}</div>
          </div>
          <div>
            <div className="text-slate-500">Email</div>
            <div className="font-semibold text-slate-900 mt-0.5">{tenant?.email ?? '—'}</div>
          </div>
          <div>
            <div className="text-slate-500">Phone</div>
            <div className="font-semibold text-slate-900 mt-0.5">{tenant?.phone ?? '—'}</div>
          </div>
          {tenant?.national_id && (
            <div>
              <div className="text-slate-500">Tenant / National ID</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-slate-900 font-mono text-xs tracking-wider">{tenant.national_id as string}</span>
                <button onClick={copyId} className="text-slate-400 hover:text-navy-700 transition-colors" title="Copy ID">
                  {copied
                    ? <Check size={13} className="text-emerald-500" />
                    : <Copy size={13} />}
                </button>
              </div>
            </div>
          )}
          {tenant?.emergency_contact && (
            <div>
              <div className="text-slate-500">Emergency Contact</div>
              <div className="font-semibold text-slate-900 mt-0.5">{tenant.emergency_contact as string}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
