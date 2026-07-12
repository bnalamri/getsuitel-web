'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldOff, ShieldCheck } from 'lucide-react'

const ROLES = ['owner', 'tenant', 'technician', 'property_manager', 'financial_manager']

export function RoleSelector({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [role, setRole]       = useState(currentRole)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleChange(newRole: string) {
    if (newRole === role) return
    setLoading(true)
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'set_role', role: newRole }),
    })
    setRole(newRole)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1.5">
      {loading && <Loader2 size={12} className="animate-spin text-slate-400" />}
      <select
        value={role}
        disabled={loading}
        onChange={e => handleChange(e.target.value)}
        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-navy-400 capitalize"
      >
        {ROLES.map(r => (
          <option key={r} value={r}>{r.replace('_', ' ')}</option>
        ))}
      </select>
    </div>
  )
}

export function DisableButton({ userId, isDisabled }: { userId: string; isDisabled: boolean }) {
  const [loading, setLoading]   = useState(false)
  const [disabled, setDisabled] = useState(isDisabled)
  const router = useRouter()

  async function toggle() {
    setLoading(true)
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: disabled ? 'enable' : 'disable' }),
    })
    setDisabled(v => !v)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={disabled ? 'Enable account' : 'Disable account'}
      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors disabled:opacity-50
        ${disabled
          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
          : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}
    >
      {loading
        ? <Loader2 size={12} className="animate-spin" />
        : disabled
          ? <><ShieldCheck size={12}/> Enable</>
          : <><ShieldOff size={12}/> Disable</>
      }
    </button>
  )
}
