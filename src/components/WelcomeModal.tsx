'use client'
import { useEffect, useState } from 'react'
import { Building2, Users, Receipt, Wrench, UserCog, X, ArrowRight } from 'lucide-react'

export default function WelcomeModal({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const key = `gs_welcomed_${userId}`
    if (!localStorage.getItem(key)) {
      setOpen(true)
    }
  }, [userId])

  function dismiss() {
    localStorage.setItem(`gs_welcomed_${userId}`, '1')
    setOpen(false)
  }

  if (!open) return null

  const features = [
    { icon: Building2, label: 'Properties & Units', desc: 'Manage your portfolio, track occupancy and vacancies in one place.' },
    { icon: Users,     label: 'Tenants & Contracts', desc: 'Onboard tenants, issue contracts, and set renewal reminders.' },
    { icon: Receipt,   label: 'Invoices & Payments', desc: 'Generate invoices, track payments, cheques and bank receipts.' },
    { icon: Wrench,    label: 'Maintenance',          desc: 'Submit, assign and track maintenance requests end-to-end.' },
    { icon: UserCog,   label: 'Team & Staff',          desc: 'Invite property managers and financial managers to work with you.' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-navy-700 px-6 pt-8 pb-6 text-white relative">
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <Building2 size={20} className="text-gold-400" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Get<span className="text-gold-400">Suitel</span>
            </span>
          </div>
          <h2 className="text-2xl font-bold">Welcome aboard! 👋</h2>
          <p className="text-white/70 text-sm mt-1">
            Your smart real estate management platform is ready. Here&apos;s a quick look at what you can do.
          </p>
        </div>

        {/* Features — 2-col grid; last card spans full width when count is odd */}
        <div className="px-6 py-5 grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <div
              key={f.label}
              className={`flex gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors${i === features.length - 1 && features.length % 2 !== 0 ? ' col-span-2' : ''}`}
            >
              <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center shrink-0 mt-0.5">
                <f.icon size={15} className="text-navy-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{f.label}</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <p className="text-xs text-slate-400">Follow the setup checklist to get started quickly.</p>
          <button
            onClick={dismiss}
            className="flex items-center gap-1.5 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Let&apos;s go <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
