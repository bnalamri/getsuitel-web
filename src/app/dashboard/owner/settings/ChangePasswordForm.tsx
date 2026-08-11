'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react'

export default function ChangePasswordForm() {
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNew,   setShowNew]   = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [saved,     setSaved]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPw.length < 8) { setError('Minimum 8 characters'); return }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return }
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password: newPw })
    if (err) { setError(err.message); setLoading(false); return }
    setSaved(true)
    setNewPw('')
    setConfirmPw('')
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lock size={16} className="text-navy-700" />
        <h3 className="font-semibold text-slate-900">Change Password</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showNew ? 'text' : 'password'}
              placeholder="Minimum 8 characters"
              value={newPw}
              onChange={e => { setNewPw(e.target.value); setSaved(false) }}
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div>
          <label className="label">Confirm Password</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showConf ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value); setSaved(false) }}
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowConf(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-sm text-emerald-700">
            Password updated successfully!
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !newPw || !confirmPw}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
          {saved ? 'Updated!' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
