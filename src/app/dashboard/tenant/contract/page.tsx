import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, Calendar, Home, DollarSign, User } from 'lucide-react'

export const metadata = { title: 'My Contract' }

export default async function TenantContractPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tenant } = await supabase.from('tenants').select('*').eq('profile_id', user.id).single()
  if (!tenant) return <div className="card p-16 text-center text-slate-400">No tenant profile linked to your account.</div>

  const { data: contract } = await supabase
    .from('contracts')
    .select('*, units(unit_number, floor, area_sqm, bedrooms, bathrooms, properties(name, address, city))')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!contract) return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">My Contract</h2>
      <div className="card p-16 text-center">
        <FileText size={40} className="mx-auto text-slate-300 mb-3" />
        <h3 className="font-semibold text-slate-700">No contract found</h3>
        <p className="text-slate-400 text-sm mt-1">Your landlord hasn't created a contract yet.</p>
      </div>
    </div>
  )

  const unit = contract.units as {
    unit_number: string; floor: number; area_sqm: number; bedrooms: number; bathrooms: number;
    properties: { name: string; address: string; city: string }
  } | null

  const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700', draft: 'bg-slate-100 text-slate-600',
    expired: 'bg-red-100 text-red-700', terminated: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">My Contract</h2>
        <span className={`badge ${statusColor[contract.status]}`}>{contract.status}</span>
      </div>

      {/* Property & Unit */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Home size={16} />Property Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><div className="text-slate-500">Property</div><div className="font-semibold text-slate-900 mt-0.5">{unit?.properties?.name}</div></div>
          <div><div className="text-slate-500">Unit</div><div className="font-semibold text-slate-900 mt-0.5">Unit {unit?.unit_number}</div></div>
          <div><div className="text-slate-500">Address</div><div className="font-semibold text-slate-900 mt-0.5">{unit?.properties?.address}, {unit?.properties?.city}</div></div>
          <div><div className="text-slate-500">Floor</div><div className="font-semibold text-slate-900 mt-0.5">{unit?.floor ?? '—'}</div></div>
          {unit?.area_sqm && <div><div className="text-slate-500">Area</div><div className="font-semibold text-slate-900 mt-0.5">{unit.area_sqm} m²</div></div>}
          {unit?.bedrooms && <div><div className="text-slate-500">Bedrooms / Bathrooms</div><div className="font-semibold text-slate-900 mt-0.5">{unit.bedrooms} BR / {unit.bathrooms} BA</div></div>}
        </div>
      </div>

      {/* Contract terms */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Calendar size={16} />Contract Terms</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><div className="text-slate-500">Start Date</div><div className="font-semibold text-slate-900 mt-0.5">{contract.start_date}</div></div>
          <div>
            <div className="text-slate-500">End Date</div>
            <div className="font-semibold text-slate-900 mt-0.5">{contract.end_date}</div>
            {contract.status === 'active' && daysLeft > 0 && daysLeft <= 90 && (
              <div className="text-xs text-orange-600 mt-0.5">Expires in {daysLeft} days</div>
            )}
          </div>
          <div><div className="text-slate-500">Payment Due</div><div className="font-semibold text-slate-900 mt-0.5">Day {contract.payment_day} of each month</div></div>
        </div>
      </div>

      {/* Financial */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><DollarSign size={16} />Financial</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><div className="text-slate-500">Monthly Rent</div><div className="text-2xl font-black text-navy-700 mt-0.5">{Number(contract.rent_amount).toLocaleString()} <span className="text-base font-semibold">{contract.currency}</span></div></div>
          <div><div className="text-slate-500">Security Deposit</div><div className="text-2xl font-black text-slate-700 mt-0.5">{Number(contract.deposit_amount).toLocaleString()} <span className="text-base font-semibold">{contract.currency}</span></div></div>
        </div>
      </div>

      {/* Tenant info */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><User size={16} />My Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><div className="text-slate-500">Full Name</div><div className="font-semibold text-slate-900 mt-0.5">{tenant.full_name}</div></div>
          <div><div className="text-slate-500">Email</div><div className="font-semibold text-slate-900 mt-0.5">{tenant.email}</div></div>
          <div><div className="text-slate-500">Phone</div><div className="font-semibold text-slate-900 mt-0.5">{tenant.phone}</div></div>
          {tenant.national_id && <div><div className="text-slate-500">National ID</div><div className="font-semibold text-slate-900 mt-0.5">{tenant.national_id}</div></div>}
        </div>
      </div>
    </div>
  )
}
