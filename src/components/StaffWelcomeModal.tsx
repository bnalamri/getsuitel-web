'use client'
import { useEffect, useState } from 'react'
import { Building2, Users, Receipt, Wrench, FileText, CreditCard, X, ArrowRight } from 'lucide-react'

type Role = 'property_manager' | 'financial_manager'

const roleConfig: Record<Role, {
  title: string
  subtitle: string
  features: { icon: React.ElementType; label: string; desc: string }[]
}> = {
  property_manager: {
    title: 'Welcome, Property Manager! 👋',
    subtitle: 'You have been granted access to manage properties, tenants, and maintenance requests.',
    features: [
      { icon: Building2, label: 'Properties & Units',   desc: 'View and manage the property portfolio, monitor occupancy and vacancies.' },
      { icon: Users,     label: 'Tenants & Contracts',  desc: 'Onboard tenants, manage contracts, and handle renewal reminders.' },
      { icon: Wrench,    label: 'Maintenance',           desc: 'Receive, assign, and track maintenance requests end-to-end.' },
    ],
  },
  financial_manager: {
    title: 'Welcome, Financial Manager! 👋',
    subtitle: 'You have been granted access to invoices, payments, and financial reports.',
    features: [
      { icon: Receipt,    label: 'Invoices & Payments', desc: 'Create invoices, record payments, and manage overdue accounts.' },
      { icon: CreditCard, label: 'Cheques & Receipts',  desc: 'Track cheque status, confirm bank transfers and mobile wallet receipts.' },
      { icon: FileText,   label: 'Financial Reports',   desc: 'View revenue collection reports, payment summaries, and tenant balances.' },
    ],
  },
}

export default function StaffWelcomeModal({ userId, role }: { userId: string; role: Role }) {
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

  const config = roleConfig[role]
  if (!config) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
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
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-white/70 text-sm mt-1">{config.subtitle}</p>
        </div>

        {/* Features */}
        <div className="px-6 py-5 flex flex-col gap-3">
          {config.features.map(f => (
            <div key={f.label} className="flex gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
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
          <p className="text-xs text-slate-400">Contact your owner for any access questions.</p>
          <button
            onClick={dismiss}
            className="flex items-center gap-1.5 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Get started <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
