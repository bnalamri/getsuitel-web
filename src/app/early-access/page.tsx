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
    country: 'Country', message: "Anything to add? (optional)",
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
            