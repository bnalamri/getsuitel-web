'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, CheckCircle, Globe, Building2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type InviteInfo = {
  code: string
  branch_name: string
  branch_location: string | null
  expires_at: string
}

function InvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlCode = searchParams.get('code') ?? ''

  const [code, setCode]         = useState(urlCode.toUpperCase())
  const [invite, setInvite]     = useState<InviteInfo | null>(null)
  const [validating, setVal]    = useState(false)
  const [codeError, setCodeErr] = useState('')

  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSub]    = useState(false)
  const [formError, setFormErr] = useState('')
  const [done, setDone]         = useState(false)

  // Auto-validate if code is in URL
  useEffect(() => {
    if (urlCode) validateCode(urlCode.toUpperCase())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function validateCode(c = code) {
    const clean = c.trim().toUpperCase()
    if (!clean) { setCodeErr('Enter your invite code'); return }
    setVal(true); setCodeErr(''); setInvite(null)
    try {
      const res = await fetch(`/api/invite/validate?code=${encodeURIComponent(clean)}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Invalid code')
      setInvite(d)
    } catch (e: unknown) {
      setCodeErr(e instanceof Error ? e.message : 'Invalid code')
    } finally {
      setVal(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!invite) return
    if (!name.trim()) { setFormErr('Full name is required'); return }
    if (password.length < 8) { setFormErr('Password must be at least 8 characters'); return }

    setSub(true); setFormErr('')
    try {
      // Server-side: create user + redeem invite in one step (bypasses email confirmation)
      const res = await fetch('/api/invite/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: invite.code, name: name.trim(), email: email.trim(), password }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Registration failed')

      // Sign in now that account exists
      const supabase = createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInErr) throw new Error('Account created — please sign in manually.')

      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      setSub(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#FFF8ED] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">You're in!</h2>
          <p className="text-sm text-gray-500">Your branch account is ready. Taking you to the dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF8ED] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center">
          <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center">
            <Globe className="w-5 h-5 text-gray-900" />
          </div>
          <span className="text-xl font-bold text-gray-900">GetSuitel</span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 px-6 py-5">
            <h1 className="text-white font-bold text-lg">Branch Superadmin Registration</h1>
            <p className="text-yellow-400/80 text-sm mt-0.5">You have been invited to manage a GetSuitel branch</p>
          </div>

          <div className="px-6 py-6 space-y-5">
            {/* Step 1: Enter / confirm invite code */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Invite Code</label>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setInvite(null); setCodeErr('') }}
                  placeholder="XXXX-XXXX"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <button
                  onClick={() => validateCode()}
                  disabled={validating || !!invite}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors"
                >
                  {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : invite ? '✓' : 'Verify'}
                </button>
              </div>
              {codeError && (
                <p className="flex items-center gap-1.5 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{codeError}
                </p>
              )}
            </div>

            {/* Branch confirmed banner */}
            {invite && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <Building2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">{invite.branch_name}</p>
                  {invite.branch_location && (
                    <p className="text-xs text-green-600">{invite.branch_location}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Registration form — only shown when code is valid */}
            {invite && (
              <form onSubmit={handleRegister} className="space-y-4 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">Create your account to manage this branch.</p>

                {formError && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Branch Account
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-yellow-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default function InvitePageWrapper() {
  return (
    <Suspense>
      <InvitePage />
    </Suspense>
  )
}
