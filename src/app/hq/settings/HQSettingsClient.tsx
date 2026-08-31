'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Shield, KeyRound, Eye, EyeOff, Globe, Languages,
  ExternalLink, Loader2, Save,
} from 'lucide-react'

type Profile = { id: string; full_name: string | null; email: string; avatar_url?: string | null }

// ── Shared styling ────────────────────────────────────────────────────────────
const card  = 'bg-white rounded-xl border border-gray-200 p-6'
const label = 'block text-sm font-medium text-gray-700 mb-1'
const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400'
const btn   = 'flex items-center gap-2 px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors'

function Msg({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className={`text-sm px-3 py-2 rounded-lg ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {text}
    </p>
  )
}

export default function HQSettingsClient({ profile }: { profile: Profile | null }) {
  const router = useRouter()

  // ── Profile ──────────────────────────────────────────────────────────────
  const [name,        setName]        = useState(profile?.full_name ?? '')
  const [profLoading, setProfLoading] = useState(false)
  const [profMsg,     setProfMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfLoading(true); setProfMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ full_name: name }).eq('id', profile!.id)
    setProfLoading(false)
    setProfMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Profile saved!' })
    if (!error) { setTimeout(() => setProfMsg(null), 3000); router.refresh() }
  }

  // ── Password ──────────────────────────────────────────────────────────────
  const [newPass,     setNewPass]     = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showNew,     setShowNew]     = useState(false)
  const [showConf,    setShowConf]    = useState(false)
  const [pwLoading,   setPwLoading]   = useState(false)
  const [pwMsg,       setPwMsg]       = useState<{ ok: boolean; text: string } | null>(null)

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setPwMsg(null)
    if (newPass.length < 8)        { setPwMsg({ ok: false, text: 'Password must be at least 8 characters' }); return }
    if (newPass !== confirmPass)   { setPwMsg({ ok: false, text: 'Passwords do not match' }); return }
    setPwLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setPwLoading(false)
    if (error) { setPwMsg({ ok: false, text: error.message }); return }
    setPwMsg({ ok: true, text: 'Password updated!' })
    setNewPass(''); setConfirmPass('')
    setTimeout(() => setPwMsg(null), 3000)
  }

  // ── Language ──────────────────────────────────────────────────────────────
  const [lang, setLang] = useState<'en' | 'ar'>('en')

  async function handleLang(l: 'en' | 'ar') {
    setLang(l)
    const supabase = createClient()
    await supabase.from('profiles').update({ lang_pref: l }).eq('id', profile!.id)
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your HQ admin account</p>
      </div>

      {/* ── Profile ── */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-yellow-600" />
          <h2 className="font-semibold text-gray-900">Profile</h2>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className={label}>Full Name</label>
            <input className={input} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className={label}>Email</label>
            <input className={`${input} bg-gray-50 text-gray-400 cursor-not-allowed`} value={profile?.email ?? ''} disabled />
          </div>
          <div>
            <label className={label}>Role</label>
            <input className={`${input} bg-gray-50 text-gray-400 cursor-not-allowed`} value="HQ Admin (Layer 0)" disabled />
          </div>
          {profMsg && <Msg ok={profMsg.ok} text={profMsg.text} />}
          <button type="submit" disabled={profLoading} className={btn}>
            {profLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {profMsg?.ok ? 'Saved!' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* ── Language ── */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <Languages className="w-4 h-4 text-yellow-600" />
          <h2 className="font-semibold text-gray-900">Language</h2>
        </div>
        <div className="flex gap-3">
          {(['en', 'ar'] as const).map(l => (
            <button
              key={l}
              onClick={() => handleLang(l)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                lang === l
                  ? 'bg-yellow-500 text-gray-900 border-yellow-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-400'
              }`}
            >
              {l === 'en' ? 'English' : 'العربية'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Change Password ── */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-yellow-600" />
          <h2 className="font-semibold text-gray-900">Change Password</h2>
        </div>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className={label}>New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                className={`${input} pr-10`}
                placeholder="Minimum 8 characters"
                required
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className={label}>Confirm New Password</label>
            <div className="relative">
              <input
                type={showConf ? 'text' : 'password'}
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                className={`${input} pr-10`}
                placeholder="Re-enter new password"
                required
              />
              <button type="button" onClick={() => setShowConf(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {pwMsg && <Msg ok={pwMsg.ok} text={pwMsg.text} />}
          <button type="submit" disabled={pwLoading} className={btn}>
            {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {pwMsg?.ok ? 'Updated!' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* ── Platform Info ── */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-yellow-600" />
          <h2 className="font-semibold text-gray-900">Platform</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Website</span>
            <a href="https://getsuitel.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-yellow-700 hover:underline">
              getsuitel.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Role</span>
            <span className="text-sm font-semibold text-gray-800">HQ Admin · Layer 0</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Access Level</span>
            <span className="text-sm text-gray-600">Global read/write across all branches</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Version</span>
            <span className="text-sm font-mono text-gray-500">1.0.2</span>
          </div>
        </div>
      </div>
    </div>
  )
}
