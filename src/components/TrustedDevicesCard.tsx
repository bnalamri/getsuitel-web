'use client'
import { useEffect, useState } from 'react'
import { ShieldCheck, Trash2, Monitor, Smartphone, Fingerprint, LogOut } from 'lucide-react'

interface Device {
  id: string; kind: 'browser' | 'phone'; label: string
  created_at: string; last_used_at: string; fingerprint: boolean; current: boolean
}

export default function TrustedDevicesCard() {
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    const r = await fetch('/api/auth/devices', { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    setDevices(j.devices ?? [])
  }
  useEffect(() => { load() }, [])

  async function remove(d: Device) {
    const extra = d.current ? ' This is the device you are using now; you will be asked for a code next time you sign in.' : ''
    if (!confirm(`Remove "${d.label}"? It will need an emailed code to sign in again.${d.fingerprint ? ' Its fingerprint sign-in will stop working.' : ''}${extra}`)) return
    setBusy(d.id)
    await fetch(`/api/auth/devices?id=${d.id}`, { method: 'DELETE' })
    setBusy(null); setMsg('Device removed.'); load()
  }

  async function signOutOthers() {
    if (!confirm('Sign out of every other open session? You stay signed in here.')) return
    setBusy('others')
    const r = await fetch('/api/auth/sign-out-others', { method: 'POST' })
    setBusy(null); setMsg(r.ok ? 'Other sessions were signed out.' : 'Could not sign out other sessions.')
  }

  const fmt = (v: string) => new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck size={20} className="text-emerald-600 mt-0.5" />
        <div>
          <h3 className="font-semibold text-slate-900">Trusted devices</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            A browser or phone that signed in with an emailed code stays trusted, with no more codes, until you remove it here.
            Removing a device also turns off its fingerprint sign-in. Changing your password removes all of them.
          </p>
        </div>
      </div>

      {devices === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : devices.length === 0 ? (
        <p className="text-sm text-slate-400">No trusted devices yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
          {devices.map(d => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              {d.kind === 'phone' ? <Smartphone size={18} className="text-slate-500" /> : <Monitor size={18} className="text-slate-500" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800 truncate">{d.label}</span>
                  {d.current && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">This device</span>}
                  {d.fingerprint && <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"><Fingerprint size={10} />Fingerprint</span>}
                </div>
                <div className="text-xs text-slate-400">Last used {fmt(d.last_used_at)} · added {fmt(d.created_at)}</div>
              </div>
              <button onClick={() => remove(d)} disabled={busy === d.id}
                className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Remove device">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={signOutOthers} disabled={busy === 'others'}
          className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
          <LogOut size={14} /> Sign out everywhere else
        </button>
        {msg && <span className="text-sm text-emerald-700">{msg}</span>}
      </div>
      <p className="text-xs text-slate-400">
        Use it with Remove when a device is lost: removing stops its fingerprint, this ends a sign-in that is already open.
      </p>
    </div>
  )
}
