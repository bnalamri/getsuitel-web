'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle } from 'lucide-react'

const t = {
  en: {
    title: "We're in Pilot Mode",
    sub: 'GetSuitel is currently available to a select group of early testers. Fill in your details and our team will reach out when a spot opens up.',
    name: 'Full name', email: 'Email address', company: 'Company / Property name',
    role: 'I am a…', gsm: 'Phone / GSM', whatsapp: 'WhatsApp number',
    country: 'Country', message: 'Anything you'd like to add? (optional)',
    submit: 'Request Early Access', loading: 'Sending…',
    successTitle: 'Request received!',
    successBody: 'Thank you! Our team will review your request and get in touch soon.',
    back: '← Back to home',
    roles: ['Property Owner', 'Tenant', 'Real Estate Manager', 'Other'],
    lang: 'ع',
  },
  ar: {
    title: 'المنصة في مرحلة التجربة',
    sub: 'GetSuitel متاحة حالياً لمجموعة مختارة. أدخل بياناتك وسيتواصل فريقنا معك عند توفر مقعد.',
    name: 'الاسم الكامل', email: 'البريد الإلكتروني', company: 'اسم الشركة / العقار',
    role: 'أنا…', gsm: 'رقم الهاتف', whatsapp: 'رقم واتساب',
    country: 'الدولة', message: 'هل تريد إضافة شيء؟ (اختياري)',
    submit: 'طلب الوصول المبكر', loading: 'جاري الإرسال…',
    successTitle: 'تم استلام طلبك!',
    successBody: 'شكراً لك! سيراجع فريقنا طلبك ويتواصل معك قريباً.',
    back: '→ العودة للرئيسية',
    roles: ['مالك عقار', 'مستأجر', 'مدير عقارات', 'أخرى'],
    lang: 'EN',
  },
}

export default function EarlyAccessPage() {
  const [lang, setLang] = useState<'en'|'ar'>('en')
  const T = t[lang]
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  const [form, setForm] = useState({ name:'', email:'', company:'', role:'', gsm:'', whatsapp:'', country:'', message:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  function set(k: string, v: string) { setForm(f => ({...f, [k]: v})) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/earlybird', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong. Please try again.'); setLoading(false); return }
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 flex items-center justify-center p-4">
      <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
        className={`fixed top-4 ${lang === 'ar' ? 'right-4' : 'left-4'} text-white/70 hover:text-white text-sm font-bold px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40 transition-colors`}>
        {T.lang}
      </button>

      <div className="w-full max-w-lg">
        <a href="https://www.getsuitel.com" className="text-white font-black text-3xl mb-8 block text-center hover:opacity-80 transition-opacity">
          Get<span className="text-gold-400">Suitel</span>
        </a>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle size={52} className="text-green-500 mx-auto mb-4"/>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{T.successTitle}</h2>
              <p className="text-slate-500 text-sm mb-6">{T.successBody}</p>
              <Link href="/" className="text-navy-700 font-semibold hover:underline text-sm">{T.back}</Link>
            </div>
          ) : (
            <>
              {/* Icon + heading */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-navy-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900">{T.title}</h1>
                </div>
              </div>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">{T.sub}</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.name} *</label>
                    <input value={form.name} onChange={e=>set('name',e.target.value)} required className="input" placeholder={lang==='ar'?'أنور العامري':'Anwar Al-Ameri'}/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.email} *</label>
                    <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} required className="input" placeholder="you@example.com"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.company}</label>
                    <input value={form.company} onChange={e=>set('company',e.target.value)} className="input" placeholder={lang==='ar'?'شركة العقارات':'Al-Ameri Real Estate'}/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.role}</label>
                    <select value={form.role} onChange={e=>set('role',e.target.value)} className="input">
                      <option value="">{lang==='ar'?'اختر…':'Select…'}</option>
                      {T.roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.gsm}</label>
                    <input value={form.gsm} onChange={e=>set('gsm',e.target.value)} className="input" placeholder="+968 9xxx xxxx"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.whatsapp}</label>
                    <input value={form.whatsapp} onChange={e=>set('whatsapp',e.target.value)} className="input" placeholder="+968 9xxx xxxx"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.country}</label>
                    <input value={form.country} onChange={e=>set('country',e.target.value)} className="input" placeholder={lang==='ar'?'عُمان':'Oman'}/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.message}</label>
                    <textarea value={form.message} onChange={e=>set('message',e.target.value)} rows={3} className="input resize-none" placeholder={lang==='ar'?'أخبرنا أكثر…':'Tell us a bit more…'}/>
                  </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{error}</div>}

                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <><Loader2 size={16} className="animate-spin inline mr-2"/>{T.loading}</> : T.submit}
                </button>
              </form>

              <p className="text-center mt-5">
                <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">{T.back}</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
