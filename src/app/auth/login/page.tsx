'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const t = {
  en: {
    title: 'Welcome back', sub: 'Sign in to your GetSuitel account',
    email: 'Email address', pass: 'Password', forgot: 'Forgot password?',
    signin: 'Sign In', noAccount: "Don't have an account?", register: 'Start free',
    lang: 'ع', error: 'Invalid email or password', loading: 'Signing in…',
  },
  ar: {
    title: 'مرحباً بعودتك', sub: 'تسجيل الدخول إلى حسابك',
    email: 'البريد الإلكتروني', pass: 'كلمة المرور', forgot: 'نسيت كلمة المرور؟',
    signin: 'تسجيل الدخول', noAccount: 'ليس لديك حساب؟', register: 'ابدأ مجاناً',
    lang: 'EN', error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', loading: 'جاري الدخول…',
  },
}

const ROLE_HOME: Record<string, string> = {
  superadmin: '/dashboard/admin',
  owner:      '/dashboard/owner',
  tenant:     '/dashboard/tenant',
  technician: '/dashboard/technician',
}

function LoginForm() {
  const [lang, setLang] = useState<'en'|'ar'>('en')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const params = useSearchParams()
  const T = t[lang]
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) {
        setError(authErr.message || T.error)
        setLoading(false)
        return
      }
      // Get role to redirect correctly
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Session not established. Please try again.')
        setLoading(false)
        return
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const next = params.get('next') || ROLE_HOME[profile?.role ?? 'owner'] || '/dashboard/owner'
      window.location.href = next
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : T.error)
      setLoading(false)
    }
  }

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 flex items-center justify-center p-4">
      {/* Lang toggle */}
      <button
        onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
        className="fixed top-4 left-4 text-white/70 hover:text-white text-sm font-bold px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40 transition-colors"
      >
        {T.lang}
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo-white.svg" alt="GetSuitel" className="h-14 mb-4" onError={e => {
            (e.target as HTMLImageElement).style.display='none'
          }}/>
          <a href="https://www.getsuitel.com" className="text-white/90 font-black text-3xl tracking-tight hover:opacity-80 transition-opacity">
            Get<span className="text-gold-400">Suitel</span>
          </a>
          <div className="text-white/50 text-sm mt-1">SMART REAL ESTATE MANAGEMENT</div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1">{T.title}</h1>
          <p className="text-slate-500 text-sm mb-6">{T.sub}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.email}</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email"
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">{T.pass}</label>
                <Link href="/auth/forgot-password" className="text-xs text-navy-700 hover:underline font-medium">
                  {T.forgot}
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <><Loader2 size={16} className="animate-spin"/>{T.loading}</> : T.signin}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {T.noAccount}{' '}
            <Link href="/auth/register" className="text-navy-700 font-semibold hover:underline">
              {T.register}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy-900"/>}>
      <LoginForm />
    </Suspense>
  )
}
