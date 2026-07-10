'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save, Shield, KeyRound, Eye, EyeOff, Globe } from 'lucide-react'

const CURRENCIES = ['OMR','SAR','AED','KWD','QAR','BHD','USD','GBP','EUR']
const CURRENCY_LABELS: Record<string, string> = {
  OMR:'OMR — Omani Rial', SAR:'SAR — Saudi Riyal', AED:'AED — UAE Dirham',
  KWD:'KWD — Kuwaiti Dinar', QAR:'QAR — Qatari Riyal', BHD:'BHD — Bahraini Dinar',
  USD:'USD — US Dollar', GBP:'GBP — British Pound', EUR:'EUR — Euro',
}

export default function AdminSettingsForm({ profile }: { profile: Record<string, unknown> | null }) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const [fullName, setFullName] = useState((profile?.full_name as string) ?? '')

  // Platform settings
  const [platformCurrency, setPlatformCurrency] = useState('OMR')
  const [psLoading, setPsLoading] = useState(false)
  const [psSaved, setPsSaved] = useState(false)
  const [psError, setPsError] = useState('')

  useEffect(() => {
    fetch('/api/admin/platform-settings')
      .then(r => r.json())
      .then(d => { if (d.default_currency) setPlatformCurrency(d.default_currency) })
      .catch(() => {})
  }, [])

  async function handlePlatformSettings(e: React.FormEvent) {
    e.preventDefault()
    setPsLoading(true)
    setPsError('')
    try {
      const res = await fetch('/api/admin/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_currency: platformCurrency }),
      })
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`
        try { const j = await res.json(); errMsg = j.error ?? errMsg } catch { /* non-JSON response */ }
        setPsError(errMsg)
        return
      }
      setPsSaved(true)
      setTimeout(() => setPsSaved(false), 3000)
    } catch (e) {
      setPsError('Network error: ' + String(e))
    } finally {
      setPsLoading(false)
    }
  }

  // Password change state
  const [pwLoading, setPwLoading]   = useState(false)
  const [pwSaved, setPwSaved]       = useState(false)
  const [pwError, setPwError]       = useState('')
  const [newPass, setNewPass]       = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showNew, setShowNew]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile?.id as string)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
    setLoading(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (newPass.length < 8) { setPwError('Password must be at least 8 characters'); return }
    if (newPass !== confirmPass) { setPwError('Passwords do not match'); return }
    setPwLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setPwLoading(false)
    if (error) { setPwError(error.message); return }
    setPwSaved(true)
    setNewPass('')
    setConfirmPass('')
    setTimeout(() => setPwSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Platform Settings */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} className="text-navy-700" />
          <h3 className="font-semibold text-slate-900">Platform Settings</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">Default settings inherited by new organizations on signup.</p>
        <form onSubmit={handlePlatformSettings} className="space-y-4">
          <div>
            <label className="label">Default Currency for New Organizations</label>
            <select className="input" value={platformCurrency} onChange={e => setPlatformCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">New owners will have this currency pre-selected when they set up their organization. They can change it in their own settings.</p>
          </div>
          {psError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{psError}</div>}
          {psSaved && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2.5 rounded-lg">Platform settings saved!</div>}
          <button type="submit" disabled={psLoading} className="btn-primary flex items-center gap-2">
            {psLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {psSaved ? 'Saved!' : 'Save Platform Settings'}
          </button>
        </form>
      </div>

      {/* Profile */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-navy-700" />
          <h3 className="font-semibold text-slate-900">Admin Profile</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Full Name</label><input className="input" value={fullName} onChange={e => setFullName(e.target.value)} /></div>
          <div><label className="label">Email</label><input className="input bg-slate-50 text-slate-400 cursor-not-allowed" value={profile?.email as string} disabled /></div>
          <div><label className="label">Role</label><input className="input bg-slate-50 text-slate-400 cursor-not-allowed" value="Superadmin" disabled /></div>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={16} className="text-navy-700" />
          <h3 className="font-semibold text-slate-900">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                className="input pr-10"
                placeholder="Minimum 8 characters"
                required
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                className="input pr-10"
                placeholder="Re-enter new password"
                required
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {pwError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{pwError}</div>}
          {pwSaved && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2.5 rounded-lg">Password updated successfully!</div>}
          <button type="submit" disabled={pwLoading} className="btn-primary flex items-center gap-2">
            {pwLoading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {pwSaved ? 'Updated!' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
