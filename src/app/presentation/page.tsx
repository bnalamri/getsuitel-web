'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Home, Shield, CheckCircle2, ArrowRight, Store, Wrench, Star, Lock, PlayCircle } from 'lucide-react'

const ROLES = {
  owner: {
    video: '/videos/getsuitel-owner.mp4',
    label: { en: 'For Property Owners', ar: 'لملاك العقارات' },
    headline: { en: 'Run your properties like a professional.', ar: 'أدر عقاراتك باحترافية.' },
    points: {
      en: [
        'Manage every property and unit from one dashboard',
        'Track tenants and contracts from move-in to renewal',
        'Get paid faster — bank transfer, cheque, or mobile wallet',
        'Assign and follow maintenance requests in seconds',
        'Full financial toolkit — income statements, P&L, month-end closing',
        'Live analytics on occupancy, revenue, and cash flow',
      ],
      ar: [
        'أدر كل عقار ووحدة من لوحة تحكم واحدة',
        'تابع المستأجرين والعقود من الدخول حتى التجديد',
        'استلم مستحقاتك أسرع — تحويل بنكي، شيك، أو محفظة إلكترونية',
        'أسند طلبات الصيانة وتابعها في ثوانٍ',
        'مجموعة أدوات مالية كاملة — بيانات الدخل، الأرباح والخسائر، الإقفال الشهري',
        'تحليلات حية للإشغال والإيرادات والتدفق النقدي',
      ],
    },
  },
  superadmin: {
    video: '/videos/getsuitel-superadmin.mp4',
    label: { en: 'For Super Admins', ar: 'للمشرفين العامين' },
    headline: { en: 'Support every owner in your branch, from one console.', ar: 'ادعم كل مالك في فرعك من لوحة تحكم واحدة.' },
    points: {
      en: [
        'Onboard and support owners — approve, manage plans, track activity',
        'Manage subscriptions without the back-and-forth',
        'A complete reporting toolkit — revenue, growth, portfolio health',
        'Fine-tune exactly what owners can access, branch-wide or per owner',
        'Branch-wide alerts the moment an issue happens',
      ],
      ar: [
        'استقطب وادعم الملاك — اعتماد الحسابات، إدارة الباقات، متابعة النشاط',
        'أدر الاشتراكات دون تعقيد',
        'مجموعة تقارير كاملة — الإيرادات، النمو، وصحة المحفظة',
        'تحكم بدقة فيما يمكن للملاك الوصول إليه، على مستوى الفرع أو لكل مالك',
        'تنبيهات فورية على مستوى الفرع فور حدوث أي مشكلة',
      ],
    },
  },
} as const

type RoleKey = keyof typeof ROLES
type Lang = 'en' | 'ar'

const T = {
  en: {
    dir: 'ltr' as const,
    trial: 'Start Free Trial',
    badge: 'Platform Walkthrough',
    h1a: 'See what GetSuitel',
    h1b: 'can do for you.',
    sub: 'A two-minute guided tour, narrated and on-screen — everything you need to know before you subscribe, no brochure required.',
    marketBadge: 'Coming Soon',
    marketTitle1: 'Suitel',
    marketTitle2: 'Marketplace',
    marketSub: 'The marketplace for real estate & services — built into the same ecosystem you already manage on GetSuitel. Your vacant units and vetted service providers, in front of a wider audience.',
    listingsTitle: 'Property Listings',
    listingsDesc: 'Your available units — apartments, villas, commercial — listed directly from your verified GetSuitel account. For rent or for sale.',
    providersTitle: 'Service Providers',
    providersDesc: 'Maintenance, cleaning, renovation, and more — hire trusted providers from the GetSuitel network, with reviews and transparent pricing.',
    verified: 'Verified listings',
    ratings: 'Ratings & reviews',
    safe: 'Safe & managed',
    visitMarket: 'Visit Suitel Marketplace',
    closingH2: 'Ready to make property management smooth and professional?',
    closingSub: '30-day free trial. No credit card required.',
    talkToSales: 'Talk to Sales',
    footer: 'getsuitel.com/presentation — share this link with anyone evaluating GetSuitel',
    langBtn: 'ع',
    videoNote: 'Video narration is in English.',
  },
  ar: {
    dir: 'rtl' as const,
    trial: 'ابدأ تجربتك المجانية',
    badge: 'جولة في المنصة',
    h1a: 'شاهد ماذا يمكن',
    h1b: 'لـ GetSuitel أن يقدمه لك.',
    sub: 'جولة إرشادية مدتها دقيقتان، بالصوت والنص على الشاشة — كل ما تحتاج معرفته قبل الاشتراك، دون الحاجة لكتيب ورقي.',
    marketBadge: 'قريباً',
    marketTitle1: 'سوق',
    marketTitle2: 'سويتل',
    marketSub: 'سوق العقارات والخدمات — مبني ضمن نفس منظومة GetSuitel التي تديرها بالفعل. وحداتك الشاغرة ومزودو الخدمات الموثوقون، أمام جمهور أوسع.',
    listingsTitle: 'قوائم العقارات',
    listingsDesc: 'وحداتك المتاحة — شقق، فلل، تجاري — مدرجة مباشرة من حسابك الموثق على GetSuitel. للإيجار أو للبيع.',
    providersTitle: 'مزودو الخدمات',
    providersDesc: 'صيانة، تنظيف، تجديد، وأكثر — استعن بمزودين موثوقين من شبكة GetSuitel، مع تقييمات وأسعار شفافة.',
    verified: 'قوائم موثقة',
    ratings: 'تقييمات ومراجعات',
    safe: 'آمن ومُدار',
    visitMarket: 'زيارة سوق سويتل',
    closingH2: 'جاهز لجعل إدارة عقاراتك سلسة واحترافية؟',
    closingSub: 'تجربة مجانية 30 يوماً. بدون بطاقة ائتمانية.',
    talkToSales: 'تحدث مع المبيعات',
    footer: 'getsuitel.com/presentation — شارك هذا الرابط مع أي شخص يقيّم GetSuitel',
    langBtn: 'EN',
    videoNote: 'السرد الصوتي للفيديو باللغة الإنجليزية.',
  },
} as const

export default function PresentationPage() {
  const [lang, setLang] = useState<Lang>('en')
  const [role, setRole] = useState<RoleKey>('owner')
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang
    if (saved === 'ar') setLang('ar')
  }, [])

  function toggleLang() {
    const next = lang === 'en' ? 'ar' : 'en'
    setLang(next)
    localStorage.setItem('lang', next)
  }

  function switchRole(k: RoleKey) {
    setRole(k)
    setTimeout(() => videoRef.current?.load(), 0)
  }

  const L = T[lang]
  const R = ROLES[role]

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 text-white" dir={L.dir}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <a href="https://www.getsuitel.com" className="font-black text-2xl">
          Get<span className="text-gold-400">Suitel</span>
        </a>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="text-xs font-bold text-white/70 hover:text-white px-3 py-1.5 rounded-lg border border-white/20 transition-colors"
          >
            {L.langBtn}
          </button>
          <Link
            href="/auth/register"
            className="hidden sm:inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            {L.trial} <ArrowRight size={16} className={lang === 'ar' ? 'rotate-180' : ''} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-10 pb-8">
        <div className="inline-block bg-gold-500/15 border border-gold-500/35 text-gold-300 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-5">
          {L.badge}
        </div>
        <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
          {L.h1a}<br className="hidden sm:block" /> {L.h1b}
        </h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          {L.sub}
        </p>
      </section>

      {/* Role picker */}
      <div className="flex justify-center gap-3 mb-8 px-6">
        {(Object.keys(ROLES) as RoleKey[]).map((k) => (
          <button
            key={k}
            onClick={() => switchRole(k)}
            className={
              'px-6 py-2.5 rounded-full text-sm font-bold transition-colors border ' +
              (role === k
                ? 'bg-gold-500 text-navy-900 border-gold-500'
                : 'bg-white/5 text-white/70 border-white/15 hover:border-white/30')
            }
          >
            {ROLES[k].label[lang]}
          </button>
        ))}
      </div>

      {/* Video + points */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-white/[0.03] border border-gold-500/20 rounded-2xl p-4 sm:p-6 shadow-2xl">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} controls autoPlay key={role} className="w-full h-full">
              <source src={R.video} type="video/mp4" />
            </video>
          </div>
          {lang === 'ar' && (
            <p className="text-white/40 text-xs mt-2 text-center">{L.videoNote}</p>
          )}

          <h2 className="text-2xl font-bold mt-6 mb-4">{R.headline[lang]}</h2>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {R.points[lang].map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-white/75">
                <CheckCircle2 size={17} className="text-gold-400 flex-shrink-0 mt-0.5" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Marketplace section */}
      <section className="bg-navy-950/60 border-y border-white/10 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-white/10 text-white/70 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-5">
            {L.marketBadge}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            {L.marketTitle1} <span className="text-gold-400">{L.marketTitle2}</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-10">
            {L.marketSub}
          </p>

          <div className="grid sm:grid-cols-2 gap-5 text-start">
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
              <Home size={26} className="text-gold-400 mb-3" />
              <h3 className="font-bold text-lg mb-2">{L.listingsTitle}</h3>
              <p className="text-sm text-white/60">
                {L.listingsDesc}
              </p>
            </div>
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
              <Wrench size={26} className="text-gold-400 mb-3" />
              <h3 className="font-bold text-lg mb-2">{L.providersTitle}</h3>
              <p className="text-sm text-white/60">
                {L.providersDesc}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-white/50">
            <span className="flex items-center gap-2"><Shield size={16} className="text-gold-400" /> {L.verified}</span>
            <span className="flex items-center gap-2"><Star size={16} className="text-gold-400" /> {L.ratings}</span>
            <span className="flex items-center gap-2"><Lock size={16} className="text-gold-400" /> {L.safe}</span>
          </div>

          <a
            href="https://market.getsuitel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-8 text-gold-300 hover:text-gold-200 font-semibold text-sm"
          >
            {L.visitMarket} <ArrowRight size={16} className={lang === 'ar' ? 'rotate-180' : ''} />
          </a>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-2xl mx-auto text-center px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-black mb-3">
          {L.closingH2}
        </h2>
        <p className="text-white/60 mb-8">{L.closingSub}</p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold px-7 py-3.5 rounded-xl transition-colors"
          >
            {L.trial} <ArrowRight size={18} className={lang === 'ar' ? 'rotate-180' : ''} />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold px-7 py-3.5 rounded-xl transition-colors"
          >
            {L.talkToSales}
          </Link>
        </div>
      </section>

      <footer className="text-center text-white/30 text-xs pb-8">
        <PlayCircle size={14} className="inline mb-0.5 mx-1" />
        {L.footer}
      </footer>
    </div>
  )
}
