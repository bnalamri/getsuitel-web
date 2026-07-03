'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'

const t = {
  en: { title: 'Set new password', pass: 'New password', confirm: 'Confirm password',
    save: 'Save password', done: 'Password updated!', doneSub: 'You can now sign in with your new password.',
    goLogin: 'Go to sign in', mismatch: 'Passwords do not match', loading: 'Saving…',
    weak: 'Password must be at least 8 characters' },
  ar: { title: 'تعيين كلمة مرور جديدة', pass: 'كلمة المرور الجديدة', confirm: 'تأكيد كلمة المرور',
    save: 'حفظ كلمة المرور', done: 'تم تحديث كلمة المرور!', doneSub: 'يمكنك الآن تسجيل الدخول بكلمة مرورك الجديدة.',
    goLogin: 'الذهاب لتسجيل الدخول', mismatch: 'كلمتا المرور غير متطابقتين', loading: 'جاري الحفظ…',
    weak: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' },
}

export default function ResetPasswordPage() {
  const [lang] = useState<'en'|'ar'>('en')
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const T = t[lang]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pass.length < 8) { setError(T.weak); return }
    if (pass !== confirm) { setError(T.mismatch); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password: pass })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <a href="https://www.getsuitel.com" className="text-white font-black text-3xl hover:opacity-80 transition-opacity">Get<span className="text-gold-400">Suitel</span></a>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {done ? (
            <div className="text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4"/>
              <h1 className="text-xl font-bold mb-2">{T.done}</h1>
              <p className="text-slate-500 text-sm mb-6">{T.doneSub}</p>
              <button onClick={() => router.push('/auth/login')} className="btn-primary">{T.goLogin}</button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-6">{T.title}</h1>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.pass}</label>
                  <div className="relative">
                    <input type={showPass ? 'text':'password'} value={pass} onChange={e=>setPass(e.target.value)}
                      required className="input pr-10" placeholder="••••••••"/>
                    <button type="button" onClick={()=>setShowPass(v=>!v)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                      {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.confirm}</label>
                  <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
                    required className="input" placeholder="••••••••"/>
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{error}</div>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <><Loader2 size={16} className="animate-spin"/>{T.loading}</> : T.save}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
