'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, Users, FileText, Receipt, Wrench, BarChart2, Bell, DoorOpen, CheckCircle, ArrowRight, Shield, HardHat, Home, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react'

const content = {
  en: {
    dir: 'ltr', lang: 'ع',
    nav: { features: 'Features', explore: 'Explore', forWho: "Who it's for", pricing: 'Pricing', signin: 'Sign in', trial: 'Sign Up' },
    hero: { badge: 'Smart Real Estate Management Platform', h1a: 'Manage Properties', h1b: 'Effortlessly', sub: 'GetSuitel brings owners, tenants, and service teams together in one powerful platform. From contracts to maintenance — all in one place.', cta1: 'Start Free Trial', cta2: 'Sign In', stats: [{ v:'30', s:'-day', l:'Free Trial' },{ v:'4', s:'', l:'User Roles' },{ v:'∞', s:'', l:'Units' }] },
    features: {
      title: 'Everything you need to run your properties',
      sub: 'One platform replacing spreadsheets, WhatsApp groups, and scattered paperwork.',
      items: [
        { title:'Property Management', desc:'Organize your portfolio with a full property → unit hierarchy. Track occupancy at a glance.' },
        { title:'Unit Tracking', desc:'Monitor every unit: status, rent, floor, area, bedrooms. Filter across your portfolio.' },
        { title:'Tenant Management', desc:'Store tenant profiles with contact details, national ID, and emergency contacts.' },
        { title:'Contracts & Leases', desc:'Create digital lease agreements linking tenants to units. Track dates and deposits.' },
        { title:'Invoicing', desc:'Generate rent and maintenance invoices. Mark payments and view revenue reports.' },
        { title:'Maintenance Requests', desc:'Tenants submit, owners assign technicians, technicians update status — real time.' },
        { title:'Notices & Alerts', desc:'Send late payment warnings or general notices to tenants with file attachments.' },
        { title:'Reports & Analytics', desc:'Revenue, occupancy rates, maintenance by category — charts to keep you informed.' },
      ],
    },
    roles: {
      title: 'Built for every role',
      sub: 'Each user gets a tailored portal designed for their specific needs.',
      items: [
        { title:'Property Owners', benefits:['Full portfolio dashboard','Tenant & contract management','Invoice generation & tracking','Maintenance oversight','Financial reports','Send notices to tenants'] },
        { title:'Tenants', benefits:['View active contract & rent details','See all invoices and payment history','Submit maintenance requests','Track repair status in real time','Receive notices from landlord','Update personal details'] },
        { title:'Technicians', benefits:['View assigned work orders','Prioritised job list (urgent first)','Full location & unit details','One-tap status updates','Schedule view by priority','Track completion history'] },
      ],
    },
    pricing: {
      title: 'Simple, transparent pricing', sub: '30-day free trial on all plans. No credit card required.', popular: 'MOST POPULAR', cta: 'Start Free Trial', month: '/month',
      plans: [
        { name:'Basic', price:'$29', desc:'Perfect for individual landlords', features:['Up to 2 properties','Up to 10 units','Up to 15 tenants','Invoicing & contracts','Maintenance requests','Email notices','Standard support'] },
        { name:'Pro', price:'$79', desc:'For growing property portfolios', features:['Up to 10 properties','Up to 50 units','Up to 75 tenants','Everything in Basic','Advanced reports','Team management','File attachments','Priority support'] },
        { name:'Enterprise', price:'$199', desc:'For large real estate companies', features:['Up to 20 properties','Unlimited units','Unlimited tenants','Everything in Pro','Custom branding','Dedicated account manager','API access','SLA guarantee'] },
      ],
      exclusive: {
        badge: 'EXCLUSIVE', name: 'Fully Managed', price: 'Custom',
        desc: 'Let GetSuitel handle everything — we manage your properties end-to-end so you can focus on growth.',
        features: [
          'Dedicated GetSuitel management team',
          'Full tenant & contract management',
          'Maintenance coordination & follow-up',
          'Monthly financial performance report',
          'End-of-year financial & tax report',
          'Priority 24/7 support',
          'Quarterly portfolio review',
        ],
        cta: 'Contact Us', ctaHref: '/contact', ctaArrow: '→',
      },
    },
    explore: {
      title: 'Explore GetSuitel Features',
      sub: 'Click any module to see exactly how it works — before you sign up.',
      tabs: [
        { key: 'properties', label: 'Properties', headline: 'Your entire portfolio at a glance', desc: 'Organise all your properties in one place. Each property holds units, tracks occupancy in real time, and rolls up into a clear revenue summary.', points: ['Add unlimited properties across any location', 'Track occupancy rates and vacant units instantly', 'Drill down into individual unit details', 'Monitor monthly revenue per property'] },
        { key: 'tenants',    label: 'Tenants',    headline: 'Complete tenant profiles',         desc: 'Store everything about each tenant — contact details, national ID, emergency contacts — all linked to their active contract and unit.', points: ['Full profile with ID and contact info', 'Linked to units and active contracts', 'Pending invitations for new registrations', 'Tenant self-service portal access'] },
        { key: 'contracts',  label: 'Contracts',  headline: 'Digital lease agreements',         desc: 'Create and manage rental contracts digitally. Track start and end dates, deposit amounts, and receive alerts before any contract expires.', points: ['Link tenants to units with signed contracts', 'Track deposit amounts and payment terms', 'Automatic alerts before contract expiry', 'Full contract history per unit and tenant'] },
        { key: 'invoices',   label: 'Invoices',   headline: 'Streamlined rent collection',      desc: 'Generate rent invoices, track payment status, and accept multiple payment methods including bank transfer, cheque, and cash — all in one place.', points: ['Auto-generate monthly rent invoices', 'Accept bank transfer, cheque, cash & card', 'Confirm receipts with proof of payment', 'Track overdue payments with instant alerts'] },
        { key: 'maintenance',label: 'Maintenance',headline: 'End-to-end maintenance tracking',  desc: 'Tenants submit requests from their portal, owners assign technicians, and technicians update status — a complete workflow with no chasing required.', points: ['Tenants submit with description and photos', 'Assign to your service team instantly', 'Real-time status updates for all parties', 'Track service charges after job completion'] },
        { key: 'reports',    label: 'Reports',    headline: 'Data-driven decisions',             desc: 'Get a complete financial and operational picture of your portfolio with printable reports, revenue breakdowns, and occupancy analytics.', points: ['Revenue collection and pending reports', 'Occupancy rate charts per property', 'Printable tenant directory with contracts', 'Maintenance cost breakdown by category'] },
      ],
    },
    footer: { desc:'Smart real estate management platform for property owners, tenants, and service teams.', product:'Product', legal:'Legal', links:{ features:'Features', pricing:'Pricing', signup:'Sign Up', signin:'Sign In' }, legal_links:{ privacy:'Privacy Policy', terms:'Terms of Service', contact:'Contact Us' }, copyright:'GetSuitel. All rights reserved.', status:'All systems operational' },
  },
  ar: {
    dir: 'rtl', lang: 'EN',
    nav: { features: 'المميزات', explore: 'استكشف', forWho: 'لمن هو؟', pricing: 'الأسعار', signin: 'تسجيل الدخول', trial: 'إنشاء حساب' },
    hero: { badge: 'منصة إدارة العقارات الذكية', h1a: 'أدر عقاراتك', h1b: 'بكل سهولة', sub: 'تجمع GetSuitel الملاك والمستأجرين وفرق الخدمة في منصة واحدة قوية. من العقود إلى الصيانة — كل شيء في مكان واحد.', cta1: 'ابدأ التجربة المجانية', cta2: 'تسجيل الدخول', stats: [{ v:'30', s:'', l:'يوم تجربة مجانية' },{ v:'4', s:'', l:'أدوار مستخدمين' },{ v:'∞', s:'', l:'وحدات' }] },
    features: {
      title: 'كل ما تحتاجه لإدارة عقاراتك',
      sub: 'منصة واحدة تحل محل جداول البيانات ومجموعات واتساب والأوراق المبعثرة.',
      items: [
        { title:'إدارة العقارات', desc:'نظّم محفظتك العقارية مع تسلسل هرمي كامل. تتبع نسبة الإشغال بنظرة واحدة.' },
        { title:'تتبع الوحدات', desc:'راقب كل وحدة: الحالة والإيجار والطابق والمساحة وعدد الغرف.' },
        { title:'إدارة المستأجرين', desc:'احتفظ بملفات المستأجرين مع تفاصيل الاتصال والهوية الوطنية.' },
        { title:'العقود وعقود الإيجار', desc:'أنشئ عقوداً رقمية تربط المستأجرين بالوحدات مع تتبع التواريخ والودائع.' },
        { title:'إصدار الفواتير', desc:'أنشئ فواتير الإيجار والصيانة. سجّل المدفوعات واعرض تقارير الإيرادات.' },
        { title:'طلبات الصيانة', desc:'يرسل المستأجرون الطلبات، يُسند الملاك للفنيين، والفنيون يحدّثون الحالة.' },
        { title:'الإشعارات والتنبيهات', desc:'أرسل إشعارات تأخر السداد أو الإشعارات العامة للمستأجرين مع مرفقات.' },
        { title:'التقارير والتحليلات', desc:'الإيرادات ونسب الإشغال والصيانة — رسوم بيانية واضحة لتبقى على اطلاع.' },
      ],
    },
    roles: {
      title: 'مبني لكل دور',
      sub: 'يحصل كل مستخدم على بوابة مخصصة مصممة لاحتياجاته المحددة.',
      items: [
        { title:'ملاك العقارات', benefits:['لوحة تحكم شاملة للمحفظة','إدارة المستأجرين والعقود','إنشاء الفواتير وتتبعها','الإشراف على الصيانة','التقارير المالية','إرسال الإشعارات للمستأجرين'] },
        { title:'المستأجرون', benefits:['عرض العقد الفعّال وتفاصيل الإيجار','الاطلاع على جميع الفواتير وسجل المدفوعات','تقديم طلبات الصيانة','تتبع حالة الإصلاح في الوقت الفعلي','استلام الإشعارات من المالك','تحديث البيانات الشخصية'] },
        { title:'الفنيون', benefits:['عرض أوامر العمل المُسندة','قائمة وظائف مرتبة حسب الأولوية','تفاصيل كاملة للموقع والوحدة','تحديث الحالة بنقرة واحدة','عرض الجدول الزمني','تتبع سجل الإنجاز'] },
      ],
    },
    pricing: {
      title: 'أسعار بسيطة وشفافة', sub: 'تجربة مجانية لمدة 30 يوماً على جميع الخطط. لا يلزم بطاقة ائتمانية.', popular: 'الأكثر شعبية', cta: 'ابدأ التجربة المجانية', month: '/ شهر',
      plans: [
        { name:'أساسي', price:'$29', desc:'مثالي للملاك الأفراد', features:['حتى عقارين','حتى 10 وحدات','حتى 15 مستأجراً','الفوترة والعقود','طلبات الصيانة','إشعارات البريد الإلكتروني','دعم عادي'] },
        { name:'احترافي', price:'$79', desc:'للمحافظ العقارية المتنامية', features:['حتى 10 عقارات','حتى 50 وحدة','حتى 75 مستأجراً','كل مميزات الأساسي','تقارير متقدمة','إدارة الفريق','المرفقات','دعم ذو أولوية'] },
        { name:'مؤسسي', price:'$199', desc:'للشركات العقارية الكبيرة', features:['حتى 20 عقاراً','وحدات غير محدودة','مستأجرون غير محدودين','كل مميزات الاحترافي','علامة تجارية مخصصة','مدير حساب مخصص','الوصول للـ API','ضمان مستوى الخدمة'] },
      ],
      exclusive: {
        badge: 'حصري', name: 'إدارة متكاملة', price: 'تسعير خاص',
        desc: 'دعنا في GetSuitel نتولى كل شيء — نُدير عقاراتك من الألف إلى الياء حتى تتفرغ للنمو.',
        features: [
          'فريق إداري مخصص من GetSuitel',
          'إدارة كاملة للمستأجرين والعقود',
          'تنسيق أعمال الصيانة ومتابعتها',
          'تقرير مالي شهري للأداء',
          'تقرير مالي وضريبي سنوي شامل',
          'دعم متميز على مدار الساعة',
          'مراجعة فصلية للمحفظة العقارية',
        ],
        cta: 'تواصل معنا', ctaHref: '/contact', ctaArrow: '←',
      },
    },
    explore: {
      title: 'استكشف مميزات GetSuitel',
      sub: 'انقر على أي وحدة لترى كيف تعمل — قبل أن تسجّل.',
      tabs: [
        { key: 'properties', label: 'العقارات',   headline: 'محفظتك بالكامل دفعة واحدة',        desc: 'نظّم جميع عقاراتك في مكان واحد. كل عقار يحتوي على وحدات ويتتبع نسبة الإشغال لحظياً مع ملخص إيرادات واضح.', points: ['أضف عقارات غير محدودة في أي موقع', 'اعرض نسب الإشغال والوحدات الشاغرة فوراً', 'تعمّق في تفاصيل كل وحدة على حدة', 'تتبع الإيرادات الشهرية لكل عقار'] },
        { key: 'tenants',    label: 'المستأجرون', headline: 'ملفات مستأجرين كاملة',             desc: 'احتفظ بكل ما تحتاجه عن كل مستأجر — بيانات الاتصال والهوية وجهة الطوارئ — مرتبطاً بعقده ووحدته الفعّالة.', points: ['ملف شامل مع الهوية وبيانات الاتصال', 'مرتبط بالوحدات والعقود الفعّالة', 'دعوات معلّقة للمستأجرين الجدد', 'وصول المستأجر لبوابته الخاصة'] },
        { key: 'contracts',  label: 'العقود',     headline: 'عقود إيجار رقمية',                 desc: 'أنشئ وأدر عقود الإيجار رقمياً. تتبع تواريخ البداية والنهاية ومبالغ التأمين واستقبل تنبيهات قبل انتهاء أي عقد.', points: ['اربط المستأجرين بالوحدات بعقود موقّعة', 'تتبع مبالغ التأمين وشروط الدفع', 'تنبيهات تلقائية قبل انتهاء العقد', 'سجل كامل بالعقود لكل وحدة ومستأجر'] },
        { key: 'invoices',   label: 'الفواتير',   headline: 'تحصيل الإيجار بكل سهولة',          desc: 'أنشئ فواتير الإيجار وتتبع حالة السداد واقبل طرق دفع متعددة تشمل التحويل والشيك والنقد — كل ذلك في مكان واحد.', points: ['إنشاء تلقائي لفواتير الإيجار الشهرية', 'قبول التحويل والشيك والنقد والبطاقة', 'تأكيد الاستلام مع إثبات السداد', 'تتبع المدفوعات المتأخرة مع تنبيهات فورية'] },
        { key: 'maintenance',label: 'الصيانة',    headline: 'تتبع الصيانة من الألف إلى الياء',  desc: 'يرسل المستأجرون الطلبات من بواباتهم، يُسند الملاك للفنيين، والفنيون يحدّثون الحالة — سير عمل متكامل بدون متابعة يدوية.', points: ['المستأجرون يرسلون مع وصف وصور', 'أسند لفريق الخدمة فوراً', 'تحديثات حالة لحظية لجميع الأطراف', 'تتبع رسوم الخدمة بعد إنجاز العمل'] },
        { key: 'reports',    label: 'التقارير',   headline: 'قرارات مبنية على البيانات',         desc: 'احصل على صورة مالية وتشغيلية كاملة لمحفظتك مع تقارير قابلة للطباعة وتحليل الإيرادات ونسب الإشغال.', points: ['تقارير الإيرادات والمدفوعات والمتأخرات', 'رسوم بيانية لنسبة الإشغال لكل عقار', 'دليل مستأجرين قابل للطباعة مع العقود', 'تحليل تكاليف الصيانة حسب الفئة'] },
      ],
    },
    footer: { desc:'منصة إدارة العقارات الذكية للملاك والمستأجرين وفرق الخدمة.', product:'المنتج', legal:'قانوني', links:{ features:'المميزات', pricing:'الأسعار', signup:'إنشاء حساب', signin:'تسجيل الدخول' }, legal_links:{ privacy:'سياسة الخصوصية', terms:'شروط الخدمة', contact:'تواصل معنا' }, copyright:'GetSuitel. جميع الحقوق محفوظة.', status:'جميع الأنظمة تعمل' },
  },
} as const

const featureIcons = [Building2, DoorOpen, Users, FileText, Receipt, Wrench, Bell, BarChart2]
const featureColors = ['bg-navy-100 text-navy-700','bg-blue-100 text-blue-700','bg-purple-100 text-purple-700','bg-indigo-100 text-indigo-700','bg-emerald-100 text-emerald-700','bg-orange-100 text-orange-700','bg-red-100 text-red-700','bg-pink-100 text-pink-700']
const roleIcons = [Shield, Home, HardHat]
const roleColors = ['from-navy-700 to-navy-900','from-emerald-600 to-emerald-800','from-orange-600 to-orange-800']

export default function LandingPage() {
  const [lang, setLang] = useState<'en'|'ar'>('en')
  const [activeTab, setActiveTab] = useState(0)
  useEffect(() => {
    const saved = localStorage.getItem('lang') as 'en'|'ar'
    if (saved === 'ar') setLang('ar')
  }, [])
  function toggleLang() {
    const next = lang === 'en' ? 'ar' : 'en'
    setLang(next)
    localStorage.setItem('lang', next)
  }
  const C = content[lang]

  return (
    <div className="font-sans" dir={C.dir}>

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-navy-900/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="https://www.getsuitel.com" className="font-black text-xl text-white hover:opacity-80 transition-opacity">Get<span className="text-gold-400">Suitel</span></a>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition-colors">{C.nav.features}</a>
            <a href="#explore" className="hover:text-white transition-colors">{C.nav.explore}</a>
            <a href="#for-who" className="hover:text-white transition-colors">{C.nav.forWho}</a>
            <a href="#pricing" className="hover:text-white transition-colors">{C.nav.pricing}</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleLang}
              className="text-xs font-bold text-white/70 hover:text-white px-3 py-1.5 rounded-lg border border-white/20 transition-colors">
              {C.lang}
            </button>
            <Link href="/auth/login" className="text-sm text-white/80 hover:text-white hidden md:block">{C.nav.signin}</Link>
            <Link href="/auth/register" className="bg-gold-500 hover:bg-gold-400 text-navy-900 text-sm font-bold px-4 py-2 rounded-lg transition-colors">{C.nav.trial}</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 overflow-hidden pt-16">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-navy-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center w-full">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/80 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />{C.hero.badge}
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
            {C.hero.h1a}<br /><span className="text-gold-400">{C.hero.h1b}</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">{C.hero.sub}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/auth/register" className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-xl shadow-gold-500/20">
              {C.hero.cta1} <ArrowRight size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
            </Link>
            <Link href="/auth/login" className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors">
              {C.hero.cta2}
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {C.hero.stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className={`font-black text-white ${s.v.length > 4 ? 'text-xl' : 'text-3xl'}`}>{s.v}<span className="text-gold-400 text-lg">{s.s}</span></div>
                <div className="text-white/50 text-sm mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">{C.features.title}</h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">{C.features.sub}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {C.features.items.map((f, i) => {
              const Icon = featureIcons[i]
              return (
                <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${featureColors[i]}`}><Icon size={20} /></div>
                  <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Feature Explorer */}
      <section id="explore" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-navy-50 border border-navy-100 rounded-full px-4 py-1.5 text-sm text-navy-700 font-medium mb-4">
              <span className="w-2 h-2 bg-navy-500 rounded-full" /> Interactive Tour
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">{C.explore.title}</h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">{C.explore.sub}</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide justify-center flex-wrap">
            {C.explore.tabs.map((tab, i) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(i)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === i
                    ? 'bg-navy-700 text-white shadow-lg shadow-navy-700/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {C.explore.tabs.map((tab, i) => {
            if (i !== activeTab) return null
            return (
              <div key={tab.key} className="grid md:grid-cols-2 gap-10 items-center">
                {/* Left — description */}
                <div className={lang === 'ar' ? 'md:order-2' : ''}>
                  <h3 className="text-2xl font-black text-slate-900 mb-3">{tab.headline}</h3>
                  <p className="text-slate-500 leading-relaxed mb-6">{tab.desc}</p>
                  <ul className="space-y-3">
                    {tab.points.map((p, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <CheckCircle2 size={18} className="text-navy-600 shrink-0 mt-0.5" />
                        <span className="text-slate-700 text-sm">{p}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/api/demo/start"
                    className="inline-flex items-center gap-2 mt-8 bg-gold-500 hover:bg-gold-400 text-navy-900 text-sm font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-gold-500/25">
                    {lang === 'ar' ? 'جرّب الآن مجاناً' : 'Try Demo — No Sign Up'} <ArrowRight size={15} className={lang === 'ar' ? 'rotate-180' : ''} />
                  </a>
                </div>

                {/* Right — mockup */}
                <div className={`bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-xl ${lang === 'ar' ? 'md:order-1' : ''}`}>
                  {/* Mock browser bar */}
                  <div className="bg-slate-200 px-4 py-2.5 flex items-center gap-2">
                    <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400"/><div className="w-3 h-3 rounded-full bg-yellow-400"/><div className="w-3 h-3 rounded-full bg-green-400"/></div>
                    <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-slate-400 mx-2">app.getsuitel.com/dashboard</div>
                  </div>

                  {/* Mock content per tab */}
                  <div className="p-5" dir="ltr">
                    {tab.key === 'properties' && (
                      <div className="space-y-3">
                        {[
                          { name: 'Oakwood Residences', loc: 'New York, USA', occ: 80, units: 10, vacant: 2, rev: '12,500' },
                          { name: 'Marina Heights',     loc: 'Los Angeles, USA', occ: 100, units: 5, vacant: 0, rev: '7,800' },
                          { name: 'Green Valley Apts',  loc: 'Chicago, USA', occ: 60, units: 8, vacant: 3, rev: '6,200' },
                        ].map((p, j) => (
                          <div key={j} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{p.loc}</div>
                              </div>
                              <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full">Active</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full mb-1.5">
                              <div className="h-full bg-navy-600 rounded-full" style={{ width: `${p.occ}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>{p.occ}% occupied · {p.vacant} vacant</span>
                              <span className="font-semibold text-slate-700">${p.rev}/mo</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {tab.key === 'tenants' && (
                      <div className="space-y-3">
                        {[
                          { name: 'James Mitchell',  unit: 'Unit 201 · Oakwood Res.',   status: 'Active',  id: 'ID-8821934' },
                          { name: 'Sarah Thompson',  unit: 'Unit 102 · Marina Heights', status: 'Active',  id: 'ID-7710023' },
                          { name: 'David Chen',      unit: 'Unit 305 · Green Valley',   status: 'Pending', id: 'ID-9934512' },
                        ].map((t, j) => (
                          <div key={j} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center text-navy-700 font-bold text-sm shrink-0">
                              {t.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-900 text-sm">{t.name}</div>
                              <div className="text-xs text-slate-400 truncate">{t.unit}</div>
                              <div className="text-xs text-slate-400 mt-0.5">ID: {t.id}</div>
                            </div>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${t.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{t.status}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {tab.key === 'contracts' && (
                      <div className="space-y-3">
                        {[
                          { tenant: 'James Mitchell', unit: 'Unit 201', start: '01 Jan 2025', end: '31 Dec 2025', rent: '1,200', deposit: '2,400', status: 'Active' },
                          { tenant: 'Sarah Thompson', unit: 'Unit 102', start: '15 Mar 2025', end: '14 Mar 2026', rent: '950',  deposit: '1,900', status: 'Active' },
                          { tenant: 'David Chen',     unit: 'Unit 305', start: '01 Jun 2024', end: '31 May 2025', rent: '800',  deposit: '1,600', status: 'Expired' },
                        ].map((c, j) => (
                          <div key={j} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-semibold text-slate-900 text-sm">{c.tenant}</div>
                                <div className="text-xs text-slate-400">{c.unit}</div>
                              </div>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-slate-400">Period: </span><span className="text-slate-700">{c.start} – {c.end}</span></div>
                              <div><span className="text-slate-400">Rent: </span><span className="font-semibold text-slate-900">${c.rent}/mo</span></div>
                              <div><span className="text-slate-400">Deposit: </span><span className="text-slate-700">${c.deposit}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {tab.key === 'invoices' && (
                      <div className="space-y-3">
                        {[
                          { tenant: 'James Mitchell', amount: '1,200', status: 'Paid',    month: 'June 2025', statusColor: 'bg-emerald-100 text-emerald-700' },
                          { tenant: 'Sarah Thompson', amount: '950',   status: 'Overdue', month: 'May 2025',  statusColor: 'bg-red-100 text-red-700' },
                          { tenant: 'David Chen',     amount: '800',   status: 'Sent',    month: 'June 2025', statusColor: 'bg-blue-100 text-blue-700' },
                          { tenant: 'Emma Wilson',    amount: '1,050', status: 'Paid',    month: 'June 2025', statusColor: 'bg-emerald-100 text-emerald-700' },
                        ].map((inv, j) => (
                          <div key={j} className="bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-900 text-sm">{inv.tenant}</div>
                              <div className="text-xs text-slate-400">{inv.month}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900 text-sm">${inv.amount}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inv.statusColor}`}>{inv.status}</span>
                            </div>
                          </div>
                        ))}
                        <div className="bg-navy-50 rounded-xl px-4 py-3 flex justify-between text-sm">
                          <span className="text-slate-600 font-medium">Total Collected</span>
                          <span className="font-black text-navy-800">$2,250</span>
                        </div>
                      </div>
                    )}

                    {tab.key === 'maintenance' && (
                      <div className="space-y-3">
                        {[
                          { title: 'AC unit not cooling', unit: 'Unit 201', priority: 'Urgent', status: 'In Progress', icon: AlertCircle, iconColor: 'text-red-500', assigned: 'Mike J. (Tech)' },
                          { title: 'Leaking pipe under sink', unit: 'Unit 102', priority: 'High',   status: 'Assigned',    icon: Clock,        iconColor: 'text-orange-500', assigned: 'Ali (Tech)' },
                          { title: 'Broken window latch',    unit: 'Unit 305', priority: 'Medium', status: 'Open',        icon: AlertCircle, iconColor: 'text-yellow-500', assigned: 'Unassigned' },
                          { title: 'Replace light fixture',  unit: 'Unit 104', priority: 'Low',    status: 'Completed',   icon: CheckCircle2, iconColor: 'text-emerald-500', assigned: 'Chris L. (Tech)' },
                        ].map((m, j) => (
                          <div key={j} className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm flex items-start gap-3">
                            <m.icon size={16} className={`${m.iconColor} shrink-0 mt-0.5`} />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-900 text-sm">{m.title}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{m.unit} · {m.assigned}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.priority === 'Urgent' ? 'bg-red-100 text-red-700' : m.priority === 'High' ? 'bg-orange-100 text-orange-700' : m.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>{m.priority}</span>
                              <span className="text-xs text-slate-400">{m.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {tab.key === 'reports' && (
                      <div className="space-y-4">
                        {/* KPI row */}
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'Revenue', value: '$26,500', sub: 'This month', color: 'text-emerald-700', bg: 'bg-emerald-50' },
                            { label: 'Occupancy', value: '82%', sub: '18/22 units', color: 'text-navy-700', bg: 'bg-navy-50' },
                            { label: 'Pending', value: '$3,800', sub: '4 invoices', color: 'text-orange-700', bg: 'bg-orange-50' },
                          ].map((k, j) => (
                            <div key={j} className={`${k.bg} rounded-xl p-3 text-center`}>
                              <div className={`font-black text-sm ${k.color}`}>{k.value}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
                              <div className="text-xs text-slate-400">{k.sub}</div>
                            </div>
                          ))}
                        </div>
                        {/* Bar chart */}
                        <div className="bg-white rounded-xl p-4 border border-slate-100">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={14} className="text-navy-600" />
                            <span className="text-xs font-semibold text-slate-700">Monthly Revenue ($)</span>
                          </div>
                          <div className="flex items-end gap-2 h-20">
                            {[55, 70, 60, 85, 75, 100].map((h, j) => (
                              <div key={j} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full bg-navy-600 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${h}%` }} />
                                <div className="text-[9px] text-slate-400">{['Jan','Feb','Mar','Apr','May','Jun'][j]}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Maintenance summary */}
                        <div className="bg-white rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-500">Open maintenance requests</span>
                          <div className="flex gap-3 text-xs">
                            <span className="text-red-600 font-semibold">2 Urgent</span>
                            <span className="text-orange-600 font-semibold">3 High</span>
                            <span className="text-slate-400">1 Low</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Roles */}
      <section id="for-who" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">{C.roles.title}</h2>
            <p className="text-xl text-slate-500 max-w-xl mx-auto">{C.roles.sub}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {C.roles.items.map((r, i) => {
              const Icon = roleIcons[i]
              return (
                <div key={i} className={`rounded-2xl bg-gradient-to-br ${roleColors[i]} p-8 text-white`}>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-6"><Icon size={26} /></div>
                  <h3 className="text-2xl font-black mb-6">{r.title}</h3>
                  <ul className="space-y-3">
                    {r.benefits.map((b, j) => (
                      <li key={j} className="flex items-center gap-3 text-sm text-white/90">
                        <CheckCircle size={15} className="flex-shrink-0 text-white/60" />{b}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">{C.pricing.title}</h2>
            <p className="text-xl text-slate-500">{C.pricing.sub}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {C.pricing.plans.map((p, i) => {
              const highlight = i === 1
              return (
                <div key={i} className={`rounded-2xl p-8 ${highlight ? 'bg-navy-800 text-white shadow-2xl shadow-navy-900/30 ring-2 ring-gold-400 scale-105' : 'bg-white border border-slate-200'}`}>
                  {highlight && <div className="bg-gold-400 text-navy-900 text-xs font-black px-3 py-1 rounded-full w-fit mb-4">{C.pricing.popular}</div>}
                  <div className={`text-lg font-bold mb-1 ${highlight?'text-white':'text-slate-900'}`}>{p.name}</div>
                  <div className={`text-sm mb-4 ${highlight?'text-white/60':'text-slate-500'}`}>{p.desc}</div>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className={`text-5xl font-black ${highlight?'text-white':'text-slate-900'}`}>{p.price}</span>
                    <span className={`text-sm ${highlight?'text-white/50':'text-slate-400'}`}>{C.pricing.month}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {p.features.map((f, j) => (
                      <li key={j} className={`flex items-center gap-3 text-sm ${highlight?'text-white/80':'text-slate-600'}`}>
                        <CheckCircle size={15} className={`flex-shrink-0 ${highlight?'text-gold-400':'text-emerald-500'}`} />{f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/auth/register" className={`block text-center py-3 rounded-xl font-bold text-sm transition-colors ${highlight?'bg-gold-400 hover:bg-gold-300 text-navy-900':'bg-navy-800 hover:bg-navy-700 text-white'}`}>
                    {C.pricing.cta}
                  </Link>
                </div>
              )
            })}
          </div>

          {/* Exclusive / Fully Managed plan */}
          <div className="mt-10 rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-navy-900 to-slate-900 ring-2 ring-gold-400 shadow-2xl">
            <div className="px-8 py-8 md:flex md:items-center md:gap-10">
              {/* Left: badge + title + desc */}
              <div className="md:w-72 flex-shrink-0 mb-6 md:mb-0">
                <div className="inline-flex items-center gap-2 bg-gold-400 text-navy-900 text-xs font-black px-3 py-1 rounded-full mb-4">
                  <span>★</span> {C.pricing.exclusive.badge}
                </div>
                <div className="text-2xl font-black text-white mb-2">{C.pricing.exclusive.name}</div>
                <div className="text-white/60 text-sm leading-relaxed">{C.pricing.exclusive.desc}</div>
                <div className="mt-4">
                  <span className="text-3xl font-black text-gold-400">{C.pricing.exclusive.price}</span>
                </div>
              </div>
              {/* Middle: features */}
              <ul className="flex-1 grid sm:grid-cols-2 gap-x-8 gap-y-2.5 mb-6 md:mb-0">
                {C.pricing.exclusive.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-white/80">
                    <CheckCircle size={15} className="flex-shrink-0 text-gold-400" />{f}
                  </li>
                ))}
              </ul>
              {/* Right: CTA */}
              <div className="flex-shrink-0">
                <a href={C.pricing.exclusive.ctaHref}
                  className="block text-center bg-gold-400 hover:bg-gold-300 text-navy-900 font-black px-8 py-3.5 rounded-xl transition-colors text-sm whitespace-nowrap">
                  {C.pricing.exclusive.cta} {C.pricing.exclusive.ctaArrow}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-950 text-white/60 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <a href="https://www.getsuitel.com" className="font-black text-2xl text-white mb-3 block hover:opacity-80 transition-opacity">Get<span className="text-gold-400">Suitel</span></a>
              <p className="text-sm leading-relaxed max-w-xs">{C.footer.desc}</p>
            </div>
            <div>
              <div className="font-semibold text-white mb-4 text-sm">{C.footer.product}</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">{C.footer.links.features}</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">{C.footer.links.pricing}</a></li>
                <li><Link href="/auth/register" className="hover:text-white transition-colors">{C.footer.links.signup}</Link></li>
                <li><Link href="/auth/login" className="hover:text-white transition-colors">{C.footer.links.signin}</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-white mb-4 text-sm">{C.footer.legal}</div>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{C.footer.legal_links.privacy}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{C.footer.legal_links.terms}</a></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">{C.footer.legal_links.contact}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <div>© {new Date().getFullYear()} {C.footer.copyright}</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 bg-green-400 rounded-full" />{C.footer.status}</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
