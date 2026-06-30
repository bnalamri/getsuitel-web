'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Building2, Users, FileText, Receipt, Wrench, BarChart2, Bell, DoorOpen, CheckCircle, ArrowRight, Shield, HardHat, Home } from 'lucide-react'

const content = {
  en: {
    dir: 'ltr', lang: 'ع',
    nav: { features: 'Features', forWho: "Who it's for", pricing: 'Pricing', signin: 'Sign in', trial: 'Start Free Trial' },
    hero: { badge: 'Smart Real Estate Management Platform', h1a: 'Manage Properties', h1b: 'Effortlessly', sub: 'GetSuitel brings owners, tenants, and service teams together in one powerful platform. From contracts to maintenance — all in one place.', cta1: 'Start Free Trial', cta2: 'Sign In', stats: [{ v:'30', s:'-day', l:'Free Trial' },{ v:'4', s:'', l:'User Roles' },{ v:'∞', s:'', l:'Properties' }] },
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
      title: 'Simple, transparent pricing', sub: '30-day free trial on all plans. No credit card required.', popular: 'MOST POPULAR', cta: 'Start Free Trial',
      plans: [
        { name:'Basic', price:'$29', desc:'Perfect for individual landlords', features:['Up to 10 units','Up to 15 tenants','Invoicing & contracts','Maintenance requests','Email notices','Standard support'] },
        { name:'Pro', price:'$79', desc:'For growing property portfolios', features:['Up to 50 units','Up to 75 tenants','Everything in Basic','Advanced reports','Team management','File attachments','Priority support'] },
        { name:'Enterprise', price:'$199', desc:'For large real estate companies', features:['Unlimited units & tenants','Everything in Pro','Custom branding','Dedicated account manager','API access','SLA guarantee'] },
      ],
    },
    footer: { desc:'Smart real estate management platform for property owners, tenants, and service teams.', product:'Product', legal:'Legal', links:{ features:'Features', pricing:'Pricing', signup:'Sign Up', signin:'Sign In' }, legal_links:{ privacy:'Privacy Policy', terms:'Terms of Service', contact:'Contact Us' }, copyright:'GetSuitel. All rights reserved.', status:'All systems operational' },
  },
  ar: {
    dir: 'rtl', lang: 'EN',
    nav: { features: 'المميزات', forWho: 'لمن هو؟', pricing: 'الأسعار', signin: 'تسجيل الدخول', trial: 'ابدأ مجاناً' },
    hero: { badge: 'منصة إدارة العقارات الذكية', h1a: 'أدر عقاراتك', h1b: 'بكل سهولة', sub: 'تجمع GetSuitel الملاك والمستأجرين وفرق الخدمة في منصة واحدة قوية. من العقود إلى الصيانة — كل شيء في مكان واحد.', cta1: 'ابدأ التجربة المجانية', cta2: 'تسجيل الدخول', stats: [{ v:'٣٠', s:'', l:'يوم تجربة مجانية' },{ v:'٤', s:'', l:'أدوار مستخدمين' },{ v:'∞', s:'', l:'عقارات' }] },
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
      title: 'أسعار بسيطة وشفافة', sub: 'تجربة مجانية لمدة 30 يوماً على جميع الخطط. لا يلزم بطاقة ائتمانية.', popular: 'الأكثر شعبية', cta: 'ابدأ التجربة المجانية',
      plans: [
        { name:'أساسي', price:'$29', desc:'مثالي للملاك الأفراد', features:['حتى 10 وحدات','حتى 15 مستأجراً','الفوترة والعقود','طلبات الصيانة','إشعارات البريد الإلكتروني','دعم عادي'] },
        { name:'احترافي', price:'$79', desc:'للمحافظ العقارية المتنامية', features:['حتى 50 وحدة','حتى 75 مستأجراً','كل مميزات الأساسي','تقارير متقدمة','إدارة الفريق','المرفقات','دعم ذو أولوية'] },
        { name:'مؤسسي', price:'$199', desc:'للشركات العقارية الكبيرة', features:['وحدات ومستأجرون غير محدودين','كل مميزات الاحترافي','علامة تجارية مخصصة','مدير حساب مخصص','الوصول للـ API','ضمان مستوى الخدمة'] },
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
  const C = content[lang]

  return (
    <div className="font-sans" dir={C.dir}>

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-navy-900/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-black text-xl text-white">Get<span className="text-gold-400">Suitel</span></div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition-colors">{C.nav.features}</a>
            <a href="#for-who" className="hover:text-white transition-colors">{C.nav.forWho}</a>
            <a href="#pricing" className="hover:text-white transition-colors">{C.nav.pricing}</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLang(l => l==='en'?'ar':'en')}
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
              {C.hero.cta1} <ArrowRight size={20} />
            </Link>
            <Link href="/auth/login" className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors">
              {C.hero.cta2}
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {C.hero.stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-black text-white">{s.v}<span className="text-gold-400 text-lg">{s.s}</span></div>
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
                    <span className={`text-sm ${highlight?'text-white/50':'text-slate-400'}`}>/month</span>
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
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-950 text-white/60 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="font-black text-2xl text-white mb-3">Get<span className="text-gold-400">Suitel</span></div>
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
                <li><a href="mailto:support@getsuitel.com" className="hover:text-white transition-colors">{C.footer.legal_links.contact}</a></li>
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
