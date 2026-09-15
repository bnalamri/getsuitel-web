'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Loader2, ArrowRight, Star } from 'lucide-react'

type Branch = { id: string; display_name: string; city: string | null; region: string | null }
type Plan = {
  id: string; slug: string; name_en: string; name_ar: string; desc_en: string; desc_ar: string
  price_monthly: number; currency: string; max_properties: number; max_units: number; max_tenants: number
  trial_days: number; features_en: string[]; features_ar: string[]; is_popular: boolean; sort_order: number
}

const CURRENCY_TEXT: Record<string,string> = { USD:'$', GBP:'£', EUR:'€', SAR:'SAR', AED:'AED', KWD:'KWD', QAR:'QAR', BHD:'BHD' }

function PriceTag({ plan, highlight }: { plan: Plan; highlight: boolean }) {
  if (plan.currency === 'OMR') {
    return (
      <span className="inline-flex items-baseline gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={highlight ? '/currency/omr_light.png' : '/currency/omr_dark.png'} alt="OMR" style={{height:'2.2rem',width:'auto'}} />
        <span className={`text-5xl font-black ${highlight?'text-white':'text-slate-900'}`}>{plan.price_monthly}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={`text-4xl font-black ${highlight?'text-white':'text-slate-900'}`}>{CURRENCY_TEXT[plan.currency] ?? plan.currency}</span>
      <span className={`text-5xl font-black ${highlight?'text-white':'text-slate-900'}`}>{plan.price_monthly}</span>
    </span>
  )
}

const T = {
  en: {
    dir: 'ltr' as const,
    back: '← Back to home',
    title: 'Find pricing for your market',
    sub: 'GetSuitel operates through local branches, each with its own market-appropriate pricing. Pick your branch to see the plans and prices that apply to you.',
    pick: 'Select your branch',
    placeholder: 'Choose a branch…',
    month: '/mo',
    trial: 'day free trial',
    cta: 'Start Free Trial',
    hqNote: 'Showing GetSuitel HQ’s standard reference pricing. Select a branch above to see your market’s actual plans.',
    loading: 'Loading plans…',
    popular: 'MOST POPULAR',
  },
  ar: {
    dir: 'rtl' as const,
    back: '→ العودة للرئيسية',
    title: 'اعرف الأسعار في منطقتك',
    sub: 'تعمل GetSuitel من خلال فروع محلية، لكل فرع أسعاره الخاصة المناسبة لسوقه. اختر فرعك لعرض الخطط والأسعار الخاصة بك.',
    pick: 'اختر فرعك',
    placeholder: 'اختر فرعاً…',
    month: '/شهرياً',
    trial: 'يوم تجربة مجانية',
    cta: 'ابدأ التجربة المجانية',
    hqNote: 'الأسعار المعروضة هي الأسعار المرجعية القياسية لمقر GetSuitel. اختر فرعاً أعلاه لعرض خطط وأسعار منطقتك.',
    loading: 'جاري تحميل الخطط…',
    popular: 'الأكثر طلباً',
  },
}

export default function PricingPage() {
  const [lang, setLang] = useState<'en'|'ar'>('en')
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState('')
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('lang') as 'en'|'ar'
    if (saved === 'ar') setLang('ar')
    fetch('/api/branches/active').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setBranches(data)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = branchId ? `/api/plans?branch=${branchId}` : '/api/plans'
    fetch(url).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setPlans(data.sort((a,b) => a.sort_order - b.sort_order))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [branchId])

  const t = T[lang]

  return (
    <div className="font-sans min-h-screen bg-slate-50" dir={t.dir}>
      <nav className="bg-navy-900 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-xl text-white hover:opacity-80 transition-opacity">Get<span className="text-gold-400">Suitel</span></Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { const next = lang==='en'?'ar':'en'; setLang(next); localStorage.setItem('lang', next) }}
              className="text-xs font-bold text-white/70 hover:text-white px-3 py-1.5 rounded-lg border border-white/20 transition-colors"
            >
              {lang === 'en' ? 'العربية' : 'English'}
            </button>
            <Link href="/" className="text-sm text-white/70 hover:text-white">{t.back}</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-900 mb-4">{t.title}</h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">{t.sub}</p>
        </div>

        <div className="max-w-md mx-auto mb-14">
          <label className="block text-sm font-semibold text-slate-700 mb-2">{t.pick}</label>
          <select
            value={branchId}
            onChange={e => setBranchId(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500"
          >
            <option value="">{t.placeholder}</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.display_name}{b.city ? ` — ${b.city}` : ''}</option>
            ))}
          </select>
          {!branchId && (
            <p className="text-xs text-slate-400 mt-2">{t.hqNote}</p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {plans.map(plan => {
              const highlight = plan.is_popular
              const name = lang === 'ar' ? plan.name_ar : plan.name_en
              const desc = lang === 'ar' ? plan.desc_ar : plan.desc_en
              const features = lang === 'ar' ? plan.features_ar : plan.features_en
              return (
                <div key={plan.id} className={`rounded-2xl p-6 ${highlight ? 'bg-navy-800 text-white shadow-2xl shadow-navy-900/30 ring-2 ring-gold-400 md:scale-105' : 'bg-white border border-slate-200'}`}>
                  {highlight && (
                    <div className="bg-gold-400 text-navy-900 text-xs font-black px-3 py-1 rounded-full w-fit mb-3 inline-flex items-center gap-1">
                      <Star size={10} fill="currentColor" /> {t.popular}
                    </div>
                  )}
                  <div className={`text-lg font-bold mb-1 ${highlight?'text-white':'text-slate-900'}`}>{name}</div>
                  <div className={`text-sm mb-4 ${highlight?'text-white/60':'text-slate-500'}`}>{desc}</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <PriceTag plan={plan} highlight={highlight} />
                    <span className={`text-sm ${highlight?'text-white/50':'text-slate-400'}`}>{t.month}</span>
                  </div>
                  <div className={`text-xs mb-6 ${highlight?'text-white/50':'text-slate-400'}`}>{plan.trial_days} {t.trial}</div>
                  <ul className="space-y-2.5 mb-8">
                    {features.map((f, j) => (
                      <li key={j} className={`flex items-center gap-2.5 text-sm ${highlight?'text-white/80':'text-slate-600'}`}>
                        <CheckCircle size={14} className={`flex-shrink-0 ${highlight?'text-gold-400':'text-emerald-500'}`} />{f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/auth/register" className={`flex items-center justify-center gap-2 text-center py-3 rounded-xl font-bold text-sm transition-colors ${highlight?'bg-gold-400 hover:bg-gold-300 text-navy-900':'bg-navy-800 hover:bg-navy-700 text-white'}`}>
                    {t.cta} <ArrowRight size={15} className={lang === 'ar' ? 'rotate-180' : ''} />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
