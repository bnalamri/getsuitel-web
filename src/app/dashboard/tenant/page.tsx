import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, Receipt, Wrench, Home } from 'lucide-react'

export const metadata = { title: 'Dashboard' }

export default async function TenantDashboard() {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tenant } = await supabase.from('tenants').select('id,full_name').eq('profile_id', user.id).single()

  const [invoices, maint, contracts] = tenant ? await Promise.all([
    supabase.from('invoices').select('id,amount,status,due_date').eq('tenant_id', tenant.id).order('due_date', {ascending:false}).limit(3),
    supabase.from('maintenance_requests').select('id,title,status,created_at').eq('tenant_id', tenant.id).order('created_at',{ascending:false}).limit(3),
    supabase.from('contracts').select('id,status,end_date,rent_amount,currency,units(unit_number,properties(name))').eq('tenant_id', tenant.id).eq('status','active').single(),
  ]) : [{ data:[] }, { data:[] }, { data: null }]

  const activeContract = (contracts as {data: unknown}).data as {
    id:string; end_date:string; rent_amount:number; currency:string;
    units: { unit_number:string; properties: { name:string } }
  } | null

  const overdue = (invoices.data ?? []).filter((i: { status: string }) => i.status==='overdue').length
  const openMaint = (maint.data ?? []).filter((m: { status: string }) => m.status!=='completed').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Home</h2>
        <p className="text-slate-500 text-sm mt-1">{tenant?.full_name}</p>
      </div>

      {/* Active contract summary */}
      {activeContract ? (
        <div className="card p-5 border-l-4 border-l-navy-700">
          <div className="flex items-start gap-3">
            <Home size={20} className="text-navy-700 mt-0.5"/>
            <div className="flex-1">
              <div className="font-semibold text-slate-900">
                Unit {activeContract.units?.unit_number} — {activeContract.units?.properties?.name}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                Rent: <span className="font-semibold text-slate-700">{activeContract.currency} {Number(activeContract.rent_amount).toLocaleString()}/mo</span>
                <span className="mx-2">·</span>
                Contract ends: {new Date(activeContract.end_date).toLocaleDateString()}
              </div>
            </div>
            <a href="/dashboard/tenant/contract" className="btn-secondary text-xs px-3 py-1.5">View</a>
          </div>
        </div>
      ) : (
        <div className="card p-5 text-center text-slate-500 text-sm">No active contract found.</div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Overdue Invoices', value:overdue, icon:Receipt, color:'bg-red-50 text-red-600', href:'/dashboard/tenant/invoices' },
          { label:'Open Maintenance', value:openMaint, icon:Wrench, color:'bg-orange-50 text-orange-600', href:'/dashboard/tenant/maintenance' },
          { label:'Contract', value:activeContract?'Active':'None', icon:FileText, color:'bg-green-50 text-green-600', href:'/dashboard/tenant/contract' },
        ].map(c => (
          <a key={c.label} href={c.href} className="card p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.color}`}>
              <c.icon size={17}/>
            </div>
            <div className="text-xl font-bold text-slate-900">{c.value}</div>
            <div className="text-xs text-slate-500">{c.label}</div>
          </a>
        ))}
      </div>

      {/* Recent invoices */}
      {(invoices.data ?? []).length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">Recent Invoices</h3>
            <a href="/dashboard/tenant/invoices" className="text-xs text-navy-700 hover:underline">View all</a>
          </div>
          <div className="space-y-2">
            {(invoices.data ?? []).map((inv: { id:string; amount:number; status:string; due_date:string }) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <div className="text-sm font-medium text-slate-800">OMR {Number(inv.amount).toLocaleString()}</div>
                  <div className="text-xs text-slate-400">Due {new Date(inv.due_date).toLocaleDateString()}</div>
                </div>
                <span className={`badge text-xs ${inv.status==='paid'?'bg-green-100 text-green-700':inv.status==='overdue'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
