import Link from 'next/link'
import {
  Building2, Users, FileText, Receipt, Wrench, BarChart2,
  Bell, DoorOpen, CheckCircle, ArrowRight, Shield, HardHat,
  Home, Menu, X,
} from 'lucide-react'

// ─── Navbar ──────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-navy-900/95 backdrop-blur border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="font-black text-xl tracking-tight text-white">
          Get<span className="text-gold-400">Suitel</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#for-who" className="hover:text-white transition-colors">Who it's for</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-white/80 hover:text-white transition-colors hidden md:block">
            Sign in
          </Link>
          <Link href="/auth/register"
            className="bg-gold-500 hover:bg-gold-400 text-navy-900 text-sm font-bold px-4 py-2 rounded-lg transition-colors">
            Start Free Trial
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 overflow-hidden pt-16">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-navy-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/80 mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Smart Real Estate Management Platform
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
          Manage Properties<br />
          <span className="text-gold-400">Effortlessly</span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          GetSuitel brings owners, tenants, and service teams together in one powerful platform. From contracts to maintenance — all in one place.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/auth/register"
            className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-xl shadow-gold-500/20">
            Start Free Trial <ArrowRight size={20} />
          </Link>
          <Link href="/auth/login"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors">
            Sign In
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { value: '30', label: 'Day Free Trial', suffix: '-day' },
            { value: '4', label: 'User Roles', suffix: '' },
            { value: '∞', label: 'Properties', suffix: '' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black text-white">{s.value}<span className="text-gold-400 text-lg">{s.suffix}</span></div>
              <div className="text-white/50 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────
function Features() {
  const features = [
    { icon: Building2, title: 'Property Management', desc: 'Organize your portfolio with a full property → building → unit hierarchy. Track occupancy at a glance.', color: 'bg-navy-100 text-navy-700' },
    { icon: DoorOpen, title: 'Unit Tracking', desc: 'Monitor every unit: status, rent amount, floor, area, bedrooms. Filter and search across your entire portfolio.', color: 'bg-blue-100 text-blue-700' },
    { icon: Users, title: 'Tenant Management', desc: 'Store tenant profiles with contact details, national ID, nationality, and emergency contacts in one place.', color: 'bg-purple-100 text-purple-700' },
    { icon: FileText, title: 'Contracts & Leases', desc: 'Create digital lease agreements linking tenants to units. Track start dates, end dates, rent, and deposits.', color: 'bg-indigo-100 text-indigo-700' },
    { icon: Receipt, title: 'Invoicing', desc: 'Generate rent, deposit, and maintenance invoices. Mark payments, track overdue balances, and view revenue reports.', color: 'bg-emerald-100 text-emerald-700' },
    { icon: Wrench, title: 'Maintenance Requests', desc: 'Tenants submit requests, owners assign technicians, technicians update status — all in real time.', color: 'bg-orange-100 text-orange-700' },
    { icon: Bell, title: 'Notices & Alerts', desc: 'Send formal late payment warnings or general notices to individual tenants or your entire roster, with file attachments.', color: 'bg-red-100 text-red-700' },
    { icon: BarChart2, title: 'Reports & Analytics', desc: 'Revenue by type, occupancy rates, maintenance by category — clear charts to keep you informed.', color: 'bg-pink-100 text-pink-700' },
  ]

  return (
    <section id="features" className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-4">Everything you need to run your properties</h2>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">One platform replacing spreadsheets, WhatsApp groups, and scattered paperwork.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon size={20} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Roles ────────────────────────────────────────────────────────────────────
function ForWho() {
  const roles = [
    {
      icon: Shield,
      title: 'Property Owners',
      color: 'from-navy-700 to-navy-900',
      iconBg: 'bg-white/20',
      benefits: [
        'Full portfolio dashboard',
        'Tenant & contract management',
        'Invoice generation & tracking',
        'Maintenance oversight',
        'Financial reports',
        'Send notices to tenants',
      ],
    },
    {
      icon: Home,
      title: 'Tenants',
      color: 'from-emerald-600 to-emerald-800',
      iconBg: 'bg-white/20',
      benefits: [
        'View active contract & rent details',
        'See all invoices and payment history',
        'Submit maintenance requests',
        'Track repair status in real time',
        'Receive notices from landlord',
        'Update personal details',
      ],
    },
    {
      icon: HardHat,
      title: 'Technicians',
      color: 'from-orange-600 to-orange-800',
      iconBg: 'bg-white/20',
      benefits: [
        'View assigned work orders',
        'Prioritised job list (urgent first)',
        'Full location & unit details',
        'One-tap status updates',
        'Schedule view by priority',
        'Track completion history',
      ],
    },
  ]

  return (
    <section id="for-who" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-4">Built for every role</h2>
          <p className="text-xl text-slate-500 max-w-xl mx-auto">Each user gets a tailored portal designed for their specific needs.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {roles.map(r => (
            <div key={r.title} className={`rounded-2xl bg-gradient-to-br ${r.color} p-8 text-white`}>
              <div className={`w-14 h-14 rounded-2xl ${r.iconBg} flex items-center justify-center mb-6`}>
                <r.icon size={26} />
              </div>
              <h3 className="text-2xl font-black mb-6">{r.title}</h3>
              <ul className="space-y-3">
                {r.benefits.map(b => (
                  <li key={b} className="flex items-center gap-3 text-sm text-white/90">
                    <CheckCircle size={15} className="flex-shrink-0 text-white/60" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const plans = [
    {
      name: 'Basic',
      price: '$29',
      period: '/month',
      desc: 'Perfect for individual landlords',
      highlight: false,
      features: ['Up to 10 units', 'Up to 15 tenants', 'Invoicing & contracts', 'Maintenance requests', 'Email notices', 'Standard support'],
    },
    {
      name: 'Pro',
      price: '$79',
      period: '/month',
      desc: 'For growing property portfolios',
      highlight: true,
      features: ['Up to 50 units', 'Up to 75 tenants', 'Everything in Basic', 'Advanced reports', 'Team management', 'File attachments', 'Priority support'],
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      desc: 'For large real estate companies',
      highlight: false,
      features: ['Unlimited units & tenants', 'Everything in Pro', 'Custom branding', 'Dedicated account manager', 'API access', 'SLA guarantee'],
    },
  ]

  return (
    <section id="pricing" className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-slate-500">30-day free trial on all plans. No credit card required.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {plans.map(p => (
            <div key={p.name} className={`rounded-2xl p-8 ${p.highlight ? 'bg-navy-800 text-white shadow-2xl shadow-navy-900/30 ring-2 ring-gold-400 scale-105' : 'bg-white border border-slate-200 text-slate-900'}`}>
              {p.highlight && (
                <div className="bg-gold-400 text-navy-900 text-xs font-black px-3 py-1 rounded-full w-fit mb-4">MOST POPULAR</div>
              )}
              <div className={`text-lg font-bold mb-1 ${p.highlight ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
              <div className={`text-sm mb-4 ${p.highlight ? 'text-white/60' : 'text-slate-500'}`}>{p.desc}</div>
              <div className="flex items-baseline gap-1 mb-8">
                <span className={`text-5xl font-black ${p.highlight ? 'text-white' : 'text-slate-900'}`}>{p.price}</span>
                <span className={`text-sm ${p.highlight ? 'text-white/50' : 'text-slate-400'}`}>{p.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {p.features.map(f => (
                  <li key={f} className={`flex items-center gap-3 text-sm ${p.highlight ? 'text-white/80' : 'text-slate-600'}`}>
                    <CheckCircle size={15} className={`flex-shrink-0 ${p.highlight ? 'text-gold-400' : 'text-emerald-500'}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register"
                className={`block text-center py-3 rounded-xl font-bold text-sm transition-colors ${
                  p.highlight
                    ? 'bg-gold-400 hover:bg-gold-300 text-navy-900'
                    : 'bg-navy-800 hover:bg-navy-700 text-white'
                }`}>
                Start Free Trial
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-navy-950 text-white/60 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="font-black text-2xl text-white mb-3">
              Get<span className="text-gold-400">Suitel</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Smart real estate management platform for property owners, tenants, and service teams.
            </p>
          </div>
          <div>
            <div className="font-semibold text-white mb-4 text-sm">Product</div>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><Link href="/auth/register" className="hover:text-white transition-colors">Sign Up</Link></li>
              <li><Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-white mb-4 text-sm">Legal</div>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="mailto:support@getsuitel.com" className="hover:text-white transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div>© {new Date().getFullYear()} GetSuitel. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="font-sans">
      <Navbar />
      <Hero />
      <Features />
      <ForWho />
      <Pricing />
      <Footer />
    </div>
  )
}
