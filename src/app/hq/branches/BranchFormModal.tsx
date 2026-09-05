'use client'
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

type Branch = {
  id: string; name: string; region: string | null; city: string | null; status: string
  license_fee_omr: number; revenue_share_pct: number; logo_url: string | null
  superadmin_id: string | null; pending_superadmin_email: string | null
}

// Defined outside the parent component so React treats it as a stable component type.
// If defined inside, every keystroke re-creates the function reference, causing React
// to unmount/remount the input and lose focus on every character typed.
function Field({ label, k, value, onChange, type = 'text', placeholder = '' }: {
  label: string; k: string; value: string
  onChange: (k: string, v: string) => void
  type?: string; placeholder?: string
}) {
  const inputId = `bf-${k}`
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={e => onChange(k, e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />
    </div>
  )
}

export default function BranchFormModal({
  branch, onClose, onSaved,
}: {
  branch: Branch | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name:               branch?.name ?? '',
    region:             branch?.region ?? '',
    city:               branch?.city ?? '',
    status:             branch?.status ?? 'pending_agreement',
    license_fee_omr:    branch?.license_fee_omr?.toString() ?? '0',
    revenue_share_pct:  branch?.revenue_share_pct?.toString() ?? '0',
    superadmin_id:      branch?.superadmin_id ?? '',
    logo_url:           branch?.logo_url ?? '',
    pending_superadmin_email: branch?.pending_superadmin_email ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.name.trim()) { setError('Branch name is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/hq/branches', {
        method: branch ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:                 branch?.id,
          name:               form.name.trim(),
          region:             form.region || null,
          city:               form.city || null,
          status:             form.status,
          license_fee_omr:    parseFloat(form.license_fee_omr) || 0,
          revenue_share_pct:  parseFloat(form.revenue_share_pct) || 0,
          superadmin_id:      form.superadmin_id || null,
          logo_url:           form.logo_url || null,
          pending_superadmin_email: form.pending_superadmin_email.trim() || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Save failed') }
      await res.json()
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{branch ? 'Edit Branch' : 'New Branch'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <Field label="Branch Name (city/region identifier)" k="name" value={form.name} onChange={set} placeholder="e.g. Muscat" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="City" k="city" value={form.city} onChange={set} placeholder="e.g. Muscat" />
            <Field label="Region" k="region" value={form.region} onChange={set} placeholder="e.g. Oman" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="License Fee /month" k="license_fee_omr" value={form.license_fee_omr} onChange={set} type="number" placeholder="50.000" />
            <Field label="Revenue Share %" k="revenue_share_pct" value={form.revenue_share_pct} onChange={set} type="number" placeholder="15" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              disabled={!branch}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="pending_agreement">Pending Agreement</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
            {!branch && (
              <p className="text-xs text-gray-400 mt-1">
                Every new branch starts locked as Pending Agreement. It activates automatically —
                and its superadmin invite is sent — once the franchise agreement is signed
                (HQ → Branch → Actions → Legal Agreement).
              </p>
            )}
          </div>

          <div>
            <Field label="Superadmin Email (optional)" k="pending_superadmin_email" value={form.pending_superadmin_email} onChange={set} type="email" placeholder="superadmin@example.com" />
            <p className="text-xs text-gray-400 mt-1">
              Not sent yet — saved for later. The invite is generated and emailed automatically the
              moment this branch's franchise agreement is signed, not before.
            </p>
          </div>
          <Field label="Superadmin User ID (optional)" k="superadmin_id" value={form.superadmin_id} onChange={set} placeholder="UUID of the superadmin" />
          <Field label="Logo URL (optional)" k="logo_url" value={form.logo_url} onChange={set} placeholder="https://..." />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {branch ? 'Save Changes' : 'Create Branch'}
          </button>
        </div>
      </div>
    </div>
  )
}
