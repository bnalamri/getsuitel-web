'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { Home, Shield, CheckCircle2, ArrowRight, Store, Wrench, Star, Lock, PlayCircle } from 'lucide-react'

const ROLES = {
  owner: {
    label: 'For Property Owners',
    video: '/videos/getsuitel-owner.mp4',
    headline: 'Run your properties like a professional.',
    points: [
      'Manage every property and unit from one dashboard',
      'Track tenants and contracts from move-in to renewal',
      'Get paid faster — bank transfer, cheque, or mobile wallet',
      'Assign and follow maintenance requests in seconds',
      'Full financial toolkit — income statements, P&L, month-end closing',
      'Live analytics on occupancy, revenue, and cash flow',
    ],
  },
  superadmin: {
    label: 'For Super Admins',
    video: '/videos/getsuitel-superadmin.mp4',
    headline: 'Support every owner in your branch, from one console.',
    points: [
      'Onboard and support owners — approve, manage plans, track activity',
      'Manage subscriptions without the back-and-forth',
      'A complete reporting toolkit — revenue, growth, portfolio health',
      'Fine-tune exactly what owners can access, branch-wide or per owner',
      'Branch-wide alerts the moment an issue happens',
    ],
  },
} as const

type RoleKey = keyof typeof ROLES

export default function PresentationPage() {
  const [role, setRole] = useState<RoleKey>('owner')
  const videoRef = useRef<HTMLVideoElement>(null)
  const R = ROLES[role]

  function switchRole(k: RoleKey) {
    setRole(k)
    setTimeout(() => videoRef.current?.load(), 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <a href="https://www.getsuitel.com" className="font-black text-2xl">
          Get<span className="text-gold-400">Suitel</span>
        </a>
        <Link
          href="/auth/register"
          className="hidden sm:inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          Start Free Trial <ArrowRight size={16} />
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-10 pb-8">
        <div className="inline-block bg-gold-500/15 border border-gold-500/35 text-gold-300 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-5">
          Platform Walkthrough
        </div>
        <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
          See what GetSuitel<br className="hidden sm:block" /> can do for you.
        </h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          A two-minute guided tour, narrated and on-screen — everything you need to know
          before you subscribe, no brochure required.
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
            {ROLES[k].label}
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

          <h2 className="text-2xl font-bold mt-6 mb-4">{R.headline}</h2>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {R.points.map((p) => (
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
            Coming Soon
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Suitel <span className="text-gold-400">Marketplace</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-10">
            The marketplace for real estate &amp; services — built into the same ecosystem you
            already manage on GetSuitel. Your vacant units and vetted service providers, in
            front of a wider audience.
          </p>

          <div className="grid sm:grid-cols-2 gap-5 text-left">
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
              <Home size={26} className="text-gold-400 mb-3" />
              <h3 className="font-bold text-lg mb-2">Property Listings</h3>
              <p className="text-sm text-white/60">
                Your available units — apartments, villas, commercial — listed directly from
                your verified GetSuitel account. For rent or for sale.
              </p>
            </div>
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
              <Wrench size={26} className="text-gold-400 mb-3" />
              <h3 className="font-bold text-lg mb-2">Service Providers</h3>
              <p className="text-sm text-white/60">
                Maintenance, cleaning, renovation, and more — hire trusted providers from the
                GetSuitel network, with reviews and transparent pricing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-white/50">
            <span className="flex items-center gap-2"><Shield size={16} className="text-gold-400" /> Verified listings</span>
            <span className="flex items-center gap-2"><Star size={16} className="text-gold-400" /> Ratings &amp; reviews</span>
            <span className="flex items-center gap-2"><Lock size={16} className="text-gold-400" /> Safe &amp; managed</span>
          </div>

          <a
            href="https://market.getsuitel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-8 text-gold-300 hover:text-gold-200 font-semibold text-sm"
          >
            Visit Suitel Marketplace <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-2xl mx-auto text-center px-6 py-16">
        <h2 className="text-2xl sm:text-3xl font-black mb-3">
          Ready to make property management smooth and professional?
        </h2>
        <p className="text-white/60 mb-8">30-day free trial. No credit card required.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold px-7 py-3.5 rounded-xl transition-colors"
          >
            Start Free Trial <ArrowRight size={18} />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold px-7 py-3.5 rounded-xl transition-colors"
          >
            Talk to Sales
          </Link>
        </div>
      </section>

      <footer className="text-center text-white/30 text-xs pb-8">
        <PlayCircle size={14} className="inline mb-0.5 mr-1" />
        getsuitel.com/presentation — share this link with anyone evaluating GetSuitel
      </footer>
    </div>
  )
}
