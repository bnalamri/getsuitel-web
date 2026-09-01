'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Building2, CreditCard, BarChart2,
  Settings, LogOut, Menu, X, ChevronLeft, ChevronRight,
  Globe, TrendingUp, Users, Bell, Wrench,
} from 'lucide-react'
import OmrSymbol from '@/components/ui/OmrSymbol'

// Nav icon wrapper for OmrSymbol — accepts className for consistent sizing
const OmrNavIcon = ({ className }: { className?: string }) => (
  <OmrSymbol variant="white" size={20} className={className} />
)

type Profile = { id: string; full_name: string | null; email: string; role: string; avatar_url?: string | null }

type NavItem = { href: string; icon: React.ElementType; label: string }
type NavGroup = { label: string; items: NavItem[] }

const NAV: NavGroup[] = [
  { label: 'HQ Overview', items: [
    { href: '/hq',           icon: LayoutDashboard, label: 'Dashboard'     },
    { href: '/hq/branches',  icon: Building2,       label: 'Branches'      },
    { href: '/hq/users',     icon: Users,           label: 'HQ Users'      },
  ]},
  { label: 'Finance', items: [
    { href: '/hq/billing',          icon: CreditCard,  label: 'Branch Billing'   },
    { href: '/hq/billing/revenue',  icon: OmrNavIcon,  label: 'Revenue Overview' },
  ]},
  { label: 'Reports', items: [
    { href: '/hq/reports',                   icon: BarChart2,   label: 'Platform Reports'    },
    { href: '/hq/reports/properties',         icon: Building2,   label: 'Properties'          },
    { href: '/hq/reports/tenants',            icon: Users,       label: 'Tenants'             },
    { href: '/hq/reports/maintenance',        icon: Wrench,      label: 'Maintenance'         },
    { href: '/hq/reports/revenue-trend',      icon: TrendingUp,  label: 'Revenue Trend'       },
    { href: '/hq/reports/subscriptions',      icon: CreditCard,  label: 'Subscriptions'       },
  ]},
  { label: 'System', items: [
    { href: '/hq/notices',   icon: Bell,     label: 'Notices'   },
    { href: '/hq/settings',  icon: Settings, label: 'Settings'  },
  ]},
]

export default function HQShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname   = usePathname()
  const router     = useRouter()
  const [open, setOpen]       = useState(true)
  const [mobileOpen, setMob]  = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const sidebarW = open ? 'w-64' : 'w-16'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-yellow-700/40">
        <div className="flex-shrink-0 w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
          <Globe className="w-5 h-5 text-gray-900" />
        </div>
        {open && (
          <div className="leading-tight">
            <div className="text-white font-bold text-sm">GetSuitel</div>
            <div className="text-yellow-400 text-xs font-semibold tracking-wide">HQ Management</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6 px-2">
        {NAV.map(group => (
          <div key={group.label}>
            {open && (
              <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider text-yellow-500/70">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const allHrefs = NAV.flatMap(g => g.items.map(i => i.href))
                const exactMatch = allHrefs.includes(pathname)
                const active = pathname === item.href || (!exactMatch && item.href.length > 4 && pathname.startsWith(item.href + '/'))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMob(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-yellow-500 text-gray-900 font-semibold'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                    title={!open ? item.label : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {open && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-yellow-700/40 p-3">
        {open ? (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-gray-900 font-bold text-sm flex-shrink-0">
              {(profile.full_name ?? profile.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{profile.full_name ?? 'HQ Admin'}</p>
              <p className="text-yellow-400/70 text-xs truncate">{profile.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-3">
            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-gray-900 font-bold text-sm">
              {(profile.full_name ?? profile.email)[0].toUpperCase()}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          title={!open ? 'Sign Out' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {open && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#FFF8ED] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col flex-shrink-0 ${sidebarW} bg-gray-900 transition-all duration-300 relative`}>
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className="absolute -right-3 top-20 bg-gray-900 border border-yellow-700/40 rounded-full p-0.5 text-yellow-400 hover:text-yellow-300 z-10"
        >
          {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMob(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-gray-900 z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-gray-600" onClick={() => setMob(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs font-semibold text-yellow-600 uppercase tracking-wider">GetSuitel HQ</span>
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-sm text-gray-600">Global Management Console</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs bg-yellow-100 text-yellow-800 font-semibold px-2 py-1 rounded-full">
              Layer 0 · {profile.role === 'hq_admin' ? 'HQ Admin' : 'HQ Staff'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
