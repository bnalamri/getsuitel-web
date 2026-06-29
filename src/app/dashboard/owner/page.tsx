import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Building2, DoorOpen, Users, Receipt, Wrench, TrendingUp } from 'lucide-react'

export const metadata = { title: 'Dashboard' }

async function getStats(orgId: string) {
  const supabase = await createClient()
  const [props, units, tenants, invoices, maint] = await Promise.all([
    supabase.from('properties').select('id', { count:'exact' }).eq('organization_id', orgId),
    supabase.from('units').select('id,status', { count:'exact' }).eq('organization_id', orgId),
    supabase.from('tenants').select('id', { count:'exact' }).eq('organization_id', orgId),
    supabase.from('invoices').select('amount,status').eq('organization_id', orgId),
    supabase.from('maintenance_requests').select('id,status').eq('organization_id', orgId).neq('status','completed'),
  ])
  const totalUnits = units.count ?? 0
  const occupied = units.data?.filter(u => u.status==='occupied').length ?? 0
  const totalRevenue = invoices.data?.filter(i=>i.status==='paid').reduce((s,i)=>s+Number(i.amount),0) ?? 0
  const pendingRevenue = invoices.data?.filter(i=>['sent','overdue'].includes(i.status)).reduce((s,i)=>s+Number(i.amount),0) ?? 0
  return {
    properties: props.count ?? 0,
    totalUnits,
    occupied,
    vacancy: totalUnits ? Math.round((totalUnits-occupied)/totalUnits*100) : 0,
    tenants: tenants.count ?? 0,
    totalRevenue,
    pendingRevenue,
    openMaintenance: maint.count ?? 0,
  }
}

export default async function OwnerDashboard() {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('organization_id,full_name').eq('id',user.id).single()
  if (!profile?.organization_id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <Building2 size={48} className="text-slate-300"/>
        <h2 className="text-xl font-bold text-slate-700">Set up your organization</h2>
        <p className="text-slate-500 text-sm max-w-sm">You need to create your organization profile before adding properties.</p>
        <a href="/dashboard/owner/settings" className="btn-primary">Get started</a>
      </div>
    )
  }
  const s = await getStats(profile.organization_id)

  const cards = [
    { label:'Properties', labelAr:'العقارات', value:s.properties, icon:Building2, color:'bg-navy-50 text-navy-700', border:'border-navy-100', href:'/dashboard/owner/properties' },
    { label:'Total Units', labelAr:'إجمالي الوحدات', value:s.totalUnits, icon:DoorOpen, color:'bg-slate-50 text-slate-700', border:'border-slate-100', href:'/dashboard/owner/units' },
    { label:'Occupied', labelAr:'المشغولة', value:`${s.occupied} / ${s.totalUnits}`, icon:Users, color:'bg-green-50 text-green-700', border:'border-green-100', sub:`${100-s.vacancy}% occupancy`, href:'/dashboard/owner/units' },
    { label:'Tenants', labelAr:'المستأجرون', value:s.tenants, icon:Users, color:'bg-purple-50 text-purple-700', border:'border-purple-100', href:'/dashboard/owner/tenants' },
    { label:'Revenue Collected', labelAr:'الإيرادات', value:`OMR ${s.totalRevenue.toLocaleString()}`, icon:TrendingUp, color:'bg-emerald-50 text-emerald-700', border:'border-emerald-100', sub:`OMR ${s.pendingRevenue.toLocaleString()} pending`, href:'/dashboard/owner/payments' },
    { label:'Open Maintenance', labelAr:'الصيانة المفتوحة', value:s.openMaintenance, icon:Wrench, color:'bg-orange-50 text-orange-700', border:'border-orange-100', href:'/dashboard/owner/maintenance' },
    { label:'Pending Invoices', labelAr:'فواتير معلقة', value:`OMR ${s.pendingRevenue.toLocaleString()}`, icon:Receipt, color:'bg-yellow-50 text-yellow-700', border:'border-yellow-100', href:'/dashboard/owner/invoices' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Welcome back 👋</h2>
        <p className="text-slate-500 text-sm mt-1">Here's what's happening with your properties today.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map(c => (
          <a key={c.label} href={c.href}
            className={`card p-4 flex flex-col gap-3 border ${c.border} hover:shadow-md transition-shadow`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color}`}>
              <c.icon size={20}/>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{c.value}</div>
              <div className="text-sm text-slate-500 mt-0.5">{c.label}</div>
              {c.sub && <div className="text-xs text-slate-400 mt-0.5">{c.sub}</div>}
            </div>
          </a>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {[
            {label:'Add Property', href:'/dashboard/owner/properties/new'},
            {label:'Add Tenant', href:'/dashboard/owner/tenants/new'},
            {label:'Create Invoice', href:'/dashboard/owner/invoices/new'},
            {label:'New Maintenance', href:'/dashboard/owner/maintenance/new'},
            {label:'New Contract', href:'/dashboard/owner/contracts/new'},
          ].map(a => (
            <a key={a.label} href={a.href} className="btn-secondary text-xs px-3 py-1.5">{a.label}</a>
          ))}
        </div>
      </div>
    </div>
  )
}
