'use client'
import { useEffect, useState } from 'react'
import { Building2, Users, Receipt, Settings, X, ArrowRight, Megaphone } from 'lucide-react'

type Props = { userId: string; branchName: string | null }

export default function SuperadminWelcomeModal({ userId, branchName }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const key = `gs_sa_welcomed_${userId}`
    if (!localStorage.getItem(key)) setOpen(true)
  }, [userId])

  function dismiss() {
    localStorage.setItem(`gs_sa_welcomed_${userId}`, '1')
    setOpen(false)
  }

  if (!open) return null

  const displayBranch = branchName ? `GetSuitel — ${branchName} Branch` : 'GetSuitel'

  const steps = [
    {
      icon: Building2,
      label: 'Invite Owners',
      desc: 'Share the platform with property owners in your branch to get them started.',
      href: '/dashboard/admin/owners',
    },
    {
      icon: Users,
      label: 'Manage Users',
      desc: 'View all registered users and staff across your branch.',
      href: '/dashboard/admin/users',
    },
    {
      icon: Receipt,
      label: 'Track Subscriptions',
      desc: 'Monitor subscription payments and activate owner accounts.',
      href: '/dashboard/admin/subscriptions',
    },
    {
      icon: Megaphone,
      label: 'Send Notices',
      desc: 'Broadcast platform announcements to all owners in your branch.',
      href: '/dashboard/admin/notices',
    },
    {
      icon: Settings,
      label: 'Branch Settings',
      desc: 'Set your branch logo, payment details, and platform defaults.',
      href: '/dashboard/admin/settings',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 px-6 pt-8 pb-6 text-white relative">
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <Building2 size={20} className="text-yellow-400" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Get<span className="text-yellow-400">Suitel</span>
            </span>
          </div>
          <h2 className="text-2xl font-bold">Welcome, Branch Admin! 🎉</h2>
          <p className="text-white/70 text-sm mt-1">
            You&apos;re now managing <span className="text-yellow-300 font-semibold">{displayBranch}</span>.
            Here&apos;s how to get your branch up and running.
          </p>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 grid grid-cols-2 gap-3">
          {steps.map((s, i) => (
            <a
              key={s.label}
              href={s.href}
              onClick={dismiss}
              className={`flex gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group${
                i === steps.length - 1 && steps.length % 2 !== 0 ? ' col-span-2' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-200 transition-colors">
                <s.icon size={16} className="text-yellow-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-tight">{s.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </div>
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={dismiss}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Go to Dashboard <ArrowRight size={16} />
          </button>
          <p className="text-center text-xs text-slate-400 mt-3">
            This message won&apos;t appear again. Find guides under Settings anytime.
          </p>
        </div>
      </div>
    </div>
  )
}
