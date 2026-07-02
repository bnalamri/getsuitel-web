'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save, Shield, KeyRound, Eye, EyeOff } from 'lucide-react'

export default function AdminSettingsForm({ profile }: { profile: Record<string, unknown> | null }) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const [fullName, setFullName] = useState((profile?.full_name as string) ?? '')

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
