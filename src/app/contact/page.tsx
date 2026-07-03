'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle, Mail, Phone, MessageSquare, Globe, Clock, User } from 'lucide-react'

const t = {
  en: {
    lang: 'ع', dir: 'ltr',
    badge: 'Get in Touch',
    title: 'Contact Us',
    sub: "We'd love to hear from you. Fill in the form and our team will get back to you promptly.",
    name: 'Full Name', namePh: 'Ahmed Al-Rashid',
    email: 'Email Address', emailPh: 'ahmed@example.com',
    gsm: 'GSM / Phone', gsmPh: '+968 9000 0000',
    whatsapp: 'WhatsApp Number', whatsappPh: '+968 9000 0000 (if different)',
    country: 'Country', countryPh: 'Oman',
    bestTime: 'Best Time to Call',
    bestTimeOptions: ['Any time', 'Morning (8am – 12pm)', 'Afternoon (12pm – 5pm)', 'Evening (5pm – 9pm)'],
    message: 'Your Message', messagePh: 'Tell us how we can help you…',
    send: 'Send Message', sending: 'Sending…',
    successTitle: 'Message sent!',
    successBody: 'Thank you for reaching out. Our team will contact you within 1 business day.',
    backHome: '← Back to home',
    required: 'required',
    or: 'or email us directly at',
  },
  ar: {
    lang: 'EN', dir: 'rtl',
    badge: 'تواصل معنا',
    title: 'اتصل بنا',
    sub: 'يسعدنا سماعك. أكمل النموذج وسيتواصل معك فريقنا في أقرب وقت.',
    name: 'الاسم الكامل', namePh: 'أحمد الراشد',
    email: 'البريد الإلكتروني', emailPh: 'ahmed@example.com',
    gsm: 'رقم الجوال / الهاتف', gsmPh: '+968 9000 0000',
    whatsapp: 'رقم واتساب', whatsappPh: '+968 9000 0000 (إن اختلف)',
    country: 'الدولة', countryPh: 'عُمان',
    bestTime: 'أفضل وقت للاتصال',
    bestTimeOptions: ['أي وقت', 'الصباح (8 ص – 12 م)', 'بعد الظهر (12 م – 5 م)', 'المساء (5 م – 9 م)'],
    message: 'رسالتك', messagePh: 'أخبرنا كيف يمكننا مساعدتك…',
    send: 'إرسال الرسالة', sending: 'جاري الإرسال…',
    successTitle: 'تم الإرسال!',
    successBody: 'شكراً للتواصل معنا. سيتصل بك فريقنا خلال يوم عمل واحد.',
    backHome: 'العودة للرئيسية →',
    required: 'مطلوب',
    or: 'أو راسلنا مباشرةً على',
  },
}

export default function ContactPage() {
  const [lang, setLang] = useState<'en'|'ar'>('en')
  const T = t[lang]

  const [form, setForm] = useState({
    name: '', email: '', gsm: '', whatsapp: '', country: '', bestTime: '', message: '',
  })
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)
  const [error, setError]       = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to send')
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again or email us directly.')
    }
    setLoading(false)
  }

  return (
    <div dir={T.dir} className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700">
      {/* Lang toggle */}
      <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
        className={`fixed top-4 ${lang === 'ar' ? 'right-4' : 'left-4'} z-10 text-white/70 hover:text-white text-sm font-bold px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40 transition-colors`}>
        {T.lang}
      </button>

      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Logo */}
        <div className="text-center mb-10">
          <a href="https://www.getsuitel.com" className="inline-block font-black text-3xl text-white hover:opacity-80 transition-opacity">
            Get<span className="text-gold-400">Suitel</span>
          </a>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-navy-800 px-8 py-7">
            <div className="inline-flex items-center gap-2 bg-gold-400/20 text-gold-300 text-xs font-bold px-3 py-1 rounded-full mb-3">
              <Mail size={12}/> {T.badge}
            </div>
            <h1 className="text-2xl font-black text-white">{T.title}</h1>
            <p className="text-white/60 text-sm mt-1 leading-relaxed">{T.sub}</p>
          </div>

          <div className="px-8 py-8">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-500"/>
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-2">{T.successTitle}</h2>
                <p className="text-slate-500 text-sm mb-6">{T.successBody}</p>
                <Link href="/" className="text-sm text-navy-700 hover:underline">{T.backHome}</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name + Email */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                      <User size={13} className="text-navy-600"/> {T.name}
                      <span className="text-red-400 text-xs font-normal">*</span>
                    </label>
                    <input required className="input" value={form.name}
                      onChange={e => set('name', e.target.value)} placeholder={T.namePh}/>
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                      <Mail size={13} className="text-navy-600"/> {T.email}
                      <span className="text-red-400 text-xs font-normal">*</span>
                    </label>
                    <input required type="email" className="input" value={form.email}
                      onChange={e => set('email', e.target.value)} placeholder={T.emailPh}/>
                  </div>
                </div>

                {/* GSM + WhatsApp */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                      <Phone size={13} className="text-navy-600"/> {T.gsm}
                    </label>
                    <input className="input" value={form.gsm}
                      onChange={e => set('gsm', e.target.value)} placeholder={T.gsmPh}/>
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                      <MessageSquare size={13} className="text-green-600"/> {T.whatsapp}
                    </label>
                    <input className="input" value={form.whatsapp}
                      onChange={e => set('whatsapp', e.target.value)} placeholder={T.whatsappPh}/>
                  </div>
                </div>

                {/* Country + Best time */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                      <Globe size={13} className="text-navy-600"/> {T.country}
                    </label>
                    <input className="input" value={form.country}
                      onChange={e => set('country', e.target.value)} placeholder={T.countryPh}/>
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                      <Clock size={13} className="text-navy-600"/> {T.bestTime}
                    </label>
                    <select className="input bg-white" value={form.bestTime}
                      onChange={e => set('bestTime', e.target.value)}>
                      <option value="">—</option>
                      {T.bestTimeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1.5">
                    <MessageSquare size={13} className="text-navy-600"/> {T.message}
                    <span className="text-red-400 text-xs font-normal">*</span>
                  </label>
                  <textarea required rows={5} className="input resize-none" value={form.message}
                    onChange={e => set('message', e.target.value)} placeholder={T.messagePh}/>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base font-bold">
                  {loading ? <><Loader2 size={16} className="animate-spin"/>{T.sending}</> : <><Mail size={16}/>{T.send}</>}
                </button>

                <p className="text-center text-xs text-slate-400">
                  {T.or}{' '}
                  <a href="mailto:hello@getsuitel.com" className="text-navy-700 font-semibold hover:underline">
                    hello@getsuitel.com
                  </a>
                </p>
              </form>
            )}
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-white/50 hover:text-white text-sm transition-colors">{T.backHome}</Link>
        </div>
      </div>
    </div>
  )
}
