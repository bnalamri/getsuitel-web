'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

const t = {
  en: {
    title: 'Reset your password', sub: 'Enter your email and we\'ll send a reset link',
    email: 'Email address', send: 'Send reset link', back: 'Back to sign in',
    sent: 'Check your email', sentSub: 'We sent a password reset link to',
    lang: 'ع', error: 'Email not found. Please check and try again.', loading: 'Sending…',
  },
  ar: {
    title: 'إعادة تعيين كلمة المرور', sub: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين',
    email: 'البريد الإلكتروني', send: 'إرسال رابط الإعادة', back: 'العودة لتسجيل الدخول',
    sent: 'تحقق من بريدك', sentSub: 'أرسلنا رابط إعادة التعيين إلى',
    lang: 'EN', error: 'البريد الإلكتروني غير موجود', loading: 'جاري الإرسال…',
  },
}

export default function ForgotPasswordPage() {
  const [lang, setLang] = useState<'en'|'ar'>('en')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const T = t[lang]
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (err) { setError(T.error); return }
    setSent(true)
  }

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 flex items-center justify-center p-4">
      <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
        className="fixed top-4 left-4 text-white/70 hover:text-white text-sm font-bold px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40 transition-colors">
        {T.lang}
      </button>

      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <a href="https://www.getsuitel.com" className="text-white font-black text-3xl tracking-tight hover:opacity-80 transition-opacity">
            Get<span className="text-gold-400">Suitel</span>
          </a>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4"/>
              <h1 className="text-xl font-bold text-slate-900 mb-2">{T.sent}</h1>
              <p className="text-slate-500 text-sm mb-2">{T.sentSub}</p>
              <p className="text-navy-700 font-semibold text-sm mb-6">{email}</p>
              <Link href="/auth/login" className="btn-primary inline-flex">
                <ArrowLeft size={16}/> {T.back}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900 mb-1">{T.title}</h1>
              <p className="text-slate-500 text-sm mb-6">{T.sub}</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.email}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required className="input" placeholder="you@example.com"/>
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{error}</div>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <><Loader2 size={16} className="animate-spin"/>{T.loading}</> : T.send}
                </button>
              </form>
              <div className="text-center mt-6">
                <Link href="/auth/login" className="text-sm text-navy-700 hover:underline inline-flex items-center gap-1">
                  <ArrowLeft size={14}/> {T.back}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
