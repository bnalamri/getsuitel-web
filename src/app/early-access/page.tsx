'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function EarlyAccessPage() {
  const [lang, setLang] = useState<'en'|'ar'>('en')
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 flex items-center justify-center p-4">
      <button onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
        className={`fixed top-4 ${lang === 'ar' ? 'right-4' : 'left-4'} text-white/70 hover:text-white text-sm font-bold px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40 transition-colors`}>
        {lang === 'en' ? 'ع' : 'EN'}
      </button>

      <div className="w-full max-w-lg text-center">
        <a href="https://www.getsuitel.com" className="text-white font-black text-3xl mb-10 block hover:opacity-80 transition-opacity">
          Get<span className="text-gold-400">Suitel</span>
        </a>

        <div className="bg-white rounded-2xl shadow-2xl p-10">
          {/* Icon */}
          <div className="w-16 h-16 bg-navy-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-navy-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>

          {lang === 'en' ? (
            <>
              <h1 className="text-2xl font-black text-slate-900 mb-3">We're in Pilot Mode</h1>
              <p className="text-slate-500 mb-6 leading-relaxed">
                GetSuitel is currently available to a select group of early testers.
                Access requires an invitation code issued by our team.
              </p>
              <div className="bg-gold-50 border border-gold-200 rounded-xl p-5 mb-6">
                <p className="text-sm font-semibold text-gold-800 mb-1">Interested in joining?</p>
                <p className="text-sm text-gold-700 leading-relaxed">
                  Send us an email and we'll reach out to you when a spot opens up.
                </p>
                <a href="mailto:earlybirds@omanportal.net"
                  className="mt-3 inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors">
                  earlybirds@omanportal.net
                </a>
              </div>
              <Link href="/" className="text-sm text-navy-700 hover:underline">← Back to home</Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-black text-slate-900 mb-3">المنصة في مرحلة التجربة</h1>
              <p className="text-slate-500 mb-6 leading-relaxed">
                GetSuitel متاحة حالياً لمجموعة مختارة من المختبرين الأوائل.
                يتطلب الوصول رمز دعوة صادر من فريقنا.
              </p>
              <div className="bg-gold-50 border border-gold-200 rounded-xl p-5 mb-6">
                <p className="text-sm font-semibold text-gold-800 mb-1">هل أنت مهتم بالانضمام؟</p>
                <p className="text-sm text-gold-700 leading-relaxed">
                  أرسل لنا بريداً إلكترونياً وسنتواصل معك عند توفر مقعد.
                </p>
                <a href="mailto:earlybirds@omanportal.net"
                  className="mt-3 inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors">
                  earlybirds@omanportal.net
                </a>
              </div>
              <Link href="/" className="text-sm text-navy-700 hover:underline">→ العودة للرئيسية</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
