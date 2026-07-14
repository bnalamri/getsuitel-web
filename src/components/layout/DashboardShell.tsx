'use client'
import { useState, createContext, useContext } from 'react'
import { DateFormatContext, type DateFormat } from '@/contexts/DateFormatContext'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  LayoutDashboard, Building2, DoorOpen, Users, FileText, Receipt,
  CreditCard, Wrench, HardHat, BarChart2, TrendingUp, Settings, Bell,
  LogOut, Menu, X, ChevronLeft, ChevronRight,
  ClipboardList, Calendar, Shield, AlertCircle, UserCog, Mail, Volume2, CalendarCheck, Activity,
} from 'lucide-react'

// ─── Context ─────────────────────────────────────────────────────────────────
interface ShellCtx { lang: 'ar'|'en'; setLang: (l:'ar'|'en')=>void; profile: Profile & { organizations?: unknown } }
const Ctx = createContext<ShellCtx>({ lang:'en', setLang:()=>{}, profile: {} as Profile })
export const useShell = () => useContext(Ctx)

// ─── Nav definitions ─────────────────────────────────────────────────────────
type NavItem = { href: string; icon: React.ElementType; en: string; ar: string; newTab?: boolean }
type NavGroup = { en: string; ar: string; items: NavItem[] }

const NAV: Record<string, NavGroup[]> = {
  superadmin: [
    { en:'Platform', ar:'المنصة', items:[
      { href:'/dashboard/admin', icon:LayoutDashboard, en:'Dashboard', ar:'لوحة التحكم' },
      { href:'/dashboard/admin/owners', icon:Shield, en:'Owners', ar:'الملاك' },
      { href:'/dashboard/admin/subscriptions', icon:CreditCard, en:'Subscriptions', ar:'الاشتراكات' },
      { href:'/dashboard/admin/reports', icon:BarChart2, en:'Reports', ar:'التقارير' },
      { href:'/dashboard/admin/financial-report', icon:TrendingUp, en:'Financial', ar:'المالية' },
    ]},
    { en:'Accounts', ar:'الحسابات', items:[
      { href:'/dashboard/admin/users', icon:Users, en:'Users', ar:'المستخدمون' },
      { href:'/dashboard/admin/invitations', icon:Mail, en:'Invitations', ar:'الدعوات' },
    ]},
    { en:'System', ar:'النظام', items:[
      { href:'/dashboard/admin/cron-monitor', icon:Activity, en:'Cron Monitor', ar:'مراقب المهام' },
      { href:'/dashboard/admin/demo-audio', icon:Volume2, en:'Demo Audio', ar:'صوت الجولة' },
      { href:'/dashboard/admin/settings', icon:Settings, en:'Settings', ar:'الإعدادات' },
    ]},
  ],
  owner: [
    { en:'Overview', ar:'نظرة عامة', items:[
      { href:'/dashboard/owner', icon:LayoutDashboard, en:'Dashboard', ar:'لوحة التحكم' },
    ]},
    { en:'Properties', ar:'العقارات', items:[
      { href:'/dashboard/owner/properties', icon:Building2, en:'Properties', ar:'العقارات' },
      { href:'/dashboard/owner/units', icon:DoorOpen, en:'Units', ar:'الوحدات' },
      { href:'/dashboard/owner/tenants', icon:Users, en:'Tenants', ar:'المستأجرون' },
    ]},
    { en:'Finance', ar:'المالية', items:[
      { href:'/dashboard/owner/contracts', icon:FileText, en:'Contracts', ar:'العقود' },
      { href:'/dashboard/owner/invoices', icon:Receipt, en:'Invoices', ar:'الفواتير' },
      { href:'/dashboard/owner/payments', icon:CreditCard, en:'Payments', ar:'المدفوعات' },
    ]},
    { en:'Operations', ar:'العمليات', items:[
      { href:'/dashboard/owner/maintenance', icon:Wrench, en:'Maintenance', ar:'الصيانة' },
      { href:'/dashboard/owner/notices', icon:AlertCircle, en:'Notices', ar:'الإشعارات' },
      { href:'/dashboard/owner/team', icon:HardHat, en:'Team', ar:'الفريق' },
      { href:'/dashboard/owner/reports', icon:BarChart2, en:'Reports', ar:'التقارير' },
      { href:'/dashboard/owner/reports/monthly', icon:CalendarCheck, en:'Monthly Statement', ar:'الكشف الشهري', newTab:true },
    ]},
    { en:'Account', ar:'الحساب', items:[
      { href:'/dashboard/owner/staff', icon:UserCog, en:'Staff', ar:'الموظفون' },
      { href:'/dashboard/owner/subscription', icon:CreditCard, en:'Subscription', ar:'الاشتراك' },
      { href:'/dashboard/owner/settings', icon:Settings, en:'Settings', ar:'الإعدادات' },
    ]},
  ],
  tenant: [
    { en:'My Home', ar:'منزلي', items:[
      { href:'/dashboard/tenant', icon:LayoutDashboard, en:'Dashboard', ar:'لوحة التحكم' },
      { href:'/dashboard/tenant/contract', icon:FileText, en:'My Contract', ar:'عقدي' },
      { href:'/dashboard/tenant/invoices', icon:Receipt, en:'Invoices', ar:'الفواتير' },
      { href:'/dashboard/tenant/maintenance', icon:Wrench, en:'Maintenance', ar:'الصيانة' },
      { href:'/dashboard/tenant/notices', icon:Bell, en:'Notices', ar:'الإشعارات' },
    ]},
    { en:'Account', ar:'الحساب', items:[
      { href:'/dashboard/tenant/settings', icon:Settings, en:'Settings', ar:'الإعدادات' },
    ]},
  ],
  technician: [
    { en:'Work', ar:'العمل', items:[
      { href:'/dashboard/technician', icon:LayoutDashboard, en:'Dashboard', ar:'لوحة التحكم' },
      { href:'/dashboard/technician/orders', icon:ClipboardList, en:'Work Orders', ar:'أوامر العمل' },
      { href:'/dashboard/technician/schedule', icon:Calendar, en:'Schedule', ar:'الجدول' },
    ]},
    { en:'Account', ar:'الحساب', items:[
      { href:'/dashboard/technician/settings', icon:Settings, en:'Settings', ar:'الإعدادات' },
    ]},
  ],
  property_manager: [
    { en:'Overview', ar:'نظرة عامة', items:[
      { href:'/dashboard/owner', icon:LayoutDashboard, en:'Dashboard', ar:'لوحة التحكم' },
    ]},
    { en:'Properties', ar:'العقارات', items:[
      { href:'/dashboard/owner/properties', icon:Building2, en:'Properties', ar:'العقارات' },
      { href:'/dashboard/owner/units', icon:DoorOpen, en:'Units', ar:'الوحدات' },
      { href:'/dashboard/owner/tenants', icon:Users, en:'Tenants', ar:'المستأجرون' },
      { href:'/dashboard/owner/contracts', icon:FileText, en:'Contracts', ar:'العقود' },
    ]},
    { en:'Operations', ar:'العمليات', items:[
      { href:'/dashboard/owner/maintenance', icon:Wrench, en:'Maintenance', ar:'الصيانة' },
      { href:'/dashboard/owner/notices', icon:AlertCircle, en:'Notices', ar:'الإشعارات' },
      { href:'/dashboard/owner/team', icon:HardHat, en:'Team', ar:'الفريق' },
      { href:'/dashboard/owner/reports', icon:BarChart2, en:'Reports', ar:'التقارير' },
      { href:'/dashboard/owner/reports/monthly', icon:CalendarCheck, en:'Monthly Statement', ar:'الكشف الشهري', newTab:true },
    ]},
    { en:'Account', ar:'الحساب', items:[
      { href:'/dashboard/owner/settings', icon:Settings, en:'Settings', ar:'الإعدادات' },
    ]},
  ],
  financial_manager: [
    { en:'Overview', ar:'نظرة عامة', items:[
      { href:'/dashboard/owner', icon:LayoutDashboard, en:'Dashboard', ar:'لوحة التحكم' },
    ]},
    { en:'Portfolio', ar:'المحفظة', items:[
      { href:'/dashboard/owner/properties', icon:Building2, en:'Properties', ar:'العقارات' },
      { href:'/dashboard/owner/units', icon:DoorOpen, en:'Units', ar:'الوحدات' },
    ]},
    { en:'Finance', ar:'المالية', items:[
      { href:'/dashboard/owner/contracts', icon:FileText, en:'Contracts', ar:'العقود' },
      { href:'/dashboard/owner/invoices', icon:Receipt, en:'Invoices', ar:'الفواتير' },
      { href:'/dashboard/owner/payments', icon:CreditCard, en:'Payments', ar:'المدفوعات' },
      { href:'/dashboard/owner/reports', icon:BarChart2, en:'Reports', ar:'التقارير' },
      { href:'/dashboard/owner/reports/monthly', icon:CalendarCheck, en:'Monthly Statement', ar:'الكشف الشهري', newTab:true },
    ]},
    { en:'Account', ar:'الحساب', items:[
      { href:'/dashboard/owner/settings', icon:Settings, en:'Settings', ar:'الإعدادات' },
    ]},
  ],
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ profile, lang, collapsed, onToggle }: {
  profile: Profile; lang:'ar'|'en'; collapsed:boolean; onToggle:()=>void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const groups = NAV[profile.role] ?? NAV.owner

  const ROLE_COLORS: Record<string, string> = {
    superadmin:        'from-slate-900 to-slate-700',
    owner:             'from-navy-900 to-navy-700',
    tenant:            'from-emerald-900 to-emerald-700',
    technician:        'from-orange-900 to-orange-700',
    property_manager:  'from-teal-900 to-teal-700',
    financial_manager: 'from-purple-900 to-purple-700',
  }
  const gradient = ROLE_COLORS[profile.role] ?? ROLE_COLORS.owner

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className={`flex flex-col h-full bg-gradient-to-b ${gradient} text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 flex-shrink-0">
        {!collapsed && (
          <Link href="https://www.getsuitel.com" className="flex flex-col">
            <span className="font-black text-lg tracking-tight leading-none">
              Get<span className="text-gold-400">Suitel</span>
            </span>
            <span className="text-white/40 text-[10px] tracking-widest">SMART RE</span>
          </Link>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-auto">
          {collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {groups.map((group, gi) => (
          <div key={gi}>
            {!collapsed && (
              <div className="px-2 mb-1.5 text-white/40 text-[10px] font-semibold uppercase tracking-widest">
                {lang==='ar' ? group.ar : group.en}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const staffRoles = ['property_manager', 'financial_manager']
                const roleHome = profile.role === 'superadmin' ? '/dashboard/admin'
                  : staffRoles.includes(profile.role) ? '/dashboard/owner'
                  : '/dashboard/' + profile.role
                const active = pathname === item.href || (
                  item.href !== roleHome &&
                  pathname.startsWith(item.href) &&
                  !group.items.some(other =>
                    other.href !== item.href &&
                    other.href.startsWith(item.href + '/') &&
                    pathname.startsWith(other.href)
                  )
                )
                return (
                  <Link key={item.href} href={item.href}
                    {...(item.newTab ? { target:'_blank', rel:'noopener noreferrer' } : {})}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${active ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}
                    title={collapsed ? (lang==='ar'?item.ar:item.en) : undefined}>
                    <item.icon size={17} className="flex-shrink-0"/>
                    {!collapsed && <span>{lang==='ar' ? item.ar : item.en}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3 flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {profile.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{profile.full_name}</div>
              <div className="text-white/50 text-xs capitalize">
                {profile.role === 'property_manager' ? 'Property Manager'
                 : profile.role === 'financial_manager' ? 'Financial Manager'
                 : profile.role === 'superadmin' ? 'Super Admin'
                 : profile.role}
              </div>
            </div>
            <button onClick={signOut} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Sign out">
              <LogOut size={15}/>
            </button>
          </div>
        ) : (
          <button onClick={signOut} className="w-full flex justify-center p-2 hover:bg-white/10 rounded-lg transition-colors">
            <LogOut size={16}/>
          </button>
        )}
      </div>
    </aside>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar({ profile, lang, setLang, onMobileOpen }: {
  profile: Profile; lang:'ar'|'en'; setLang:(l:'ar'|'en')=>void; onMobileOpen:()=>void
}) {
  const pathname = usePathname()
  // Derive page title from last segment
  const segment = pathname.split('/').filter(Boolean).pop() ?? 'dashboard'
  const labels: Record<string, {en:string;ar:string}> = {
    dashboard:    {en:'Dashboard',ar:'لوحة التحكم'},
    properties:   {en:'Properties',ar:'العقارات'},
    units:        {en:'Units',ar:'الوحدات'},
    tenants:      {en:'Tenants',ar:'المستأجرون'},
    contracts:    {en:'Contracts',ar:'العقود'},
    invoices:     {en:'Invoices',ar:'الفواتير'},
    payments:     {en:'Payments',ar:'المدفوعات'},
    maintenance:  {en:'Maintenance',ar:'الصيانة'},
    team:         {en:'Team',ar:'الفريق'},
    reports:      {en:'Reports',ar:'التقارير'},
    settings:     {en:'Settings',ar:'الإعدادات'},
    subscription: {en:'Subscription',ar:'الاشتراك'},
    owners:       {en:'Owners',ar:'الملاك'},
    subscriptions:     {en:'Subscriptions',ar:'الاشتراكات'},
    'financial-report':{en:'Financial Report',ar:'التقرير المالي'},
    'cron-monitor':    {en:'Cron Monitor',ar:'مراقب المهام'},
    notices:      {en:'Notices',ar:'الإشعارات'},
    orders:       {en:'Work Orders',ar:'أوامر العمل'},
    schedule:     {en:'Schedule',ar:'الجدول'},
    contract:     {en:'My Contract',ar:'عقدي'},
    cheques:      {en:'Cheque Tracker',ar:'سجل الشيكات'},
    staff:        {en:'Staff Management',ar:'إدارة الموظفين'},
    users:        {en:'Users',ar:'المستخدمون'},
    invitations:  {en:'Invitations',ar:'الدعوات'},
  }
  const title = labels[segment]?.[lang] ?? segment

  return (
    <header className="h-14 flex items-center px-4 bg-white border-b border-slate-200 gap-4 flex-shrink-0">
      <button onClick={onMobileOpen} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
        <Menu size={20}/>
      </button>
      <h1 className="font-semibold text-slate-900 text-base flex-1">{title}</h1>
      <div className="flex items-center gap-2">
        {/* Lang toggle */}
        <button onClick={() => setLang(lang==='en'?'ar':'en')}
          className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
          {lang==='en'?'ع':'EN'}
        </button>
        {/* Notifications */}
        <Link href={`/dashboard/${profile.role}/notifications`}
          className="relative p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
          <Bell size={19}/>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"/>
        </Link>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-navy-700 text-white flex items-center justify-center text-sm font-bold">
          {profile.full_name?.[0]?.toUpperCase()}
        </div>
      </div>
    </header>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────
export default function DashboardShell({
  profile, children
}: {
  profile: Profile & { organizations?: unknown }
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lang, setLang] = useState<'ar'|'en'>(profile.lang_pref ?? 'en')
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const org = profile.organizations as Record<string, unknown> | null
  const [dateFormat, setDateFormat] = useState<DateFormat>((org?.date_format as DateFormat) ?? 'dd/mm/yyyy')

  return (
    <DateFormatContext.Provider value={{ dateFormat, setDateFormat }}>
    <Ctx.Provider value={{ lang, setLang, profile }}>
      <div dir={dir} className="flex h-screen overflow-hidden bg-slate-50">

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-black/50"/>
          </div>
        )}

        {/* Mobile sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-60 lg:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar profile={profile} lang={lang} collapsed={false} onToggle={() => setMobileOpen(false)}/>
          <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 text-white/70 hover:text-white">
            <X size={20}/>
          </button>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:flex flex-shrink-0">
          <Sidebar profile={profile} lang={lang} collapsed={collapsed} onToggle={() => setCollapsed(v => !v)}/>
        </div>

        {/* Main */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar profile={profile} lang={lang} setLang={setLang} onMobileOpen={() => setMobileOpen(true)}/>
          <main className="flex-1 overflow-y-auto">
            <div clas