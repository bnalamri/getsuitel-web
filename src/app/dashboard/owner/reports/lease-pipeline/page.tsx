import { createClient, createAdminClient } from '@/lib/supabase/server'
import { CalendarCheck, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'

export const metadata = { title: 'Lease Renewal Pipeline' }
export const dynamic = 'force-dynamic'

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / 86400000)
}

export default async function LeasePipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id, full_name').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return null
  const userName = (profile?.full_name as string) || user.email || ''

  const admin = createAdminClient()
  const today = new Date()
  const in180 = new Date(today.getTime() + 180 * 86400000)
  const printDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const [contractsRes, orgRes] = await Promise.all([
    admin.from('contracts')
      .select('id, end_date, rent_amount, currency, status, tenants(full_name, email, phone), units(unit_number, properties(name))')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .lte('end_date', in180.toISOString().split('T')[0])
      .gte('end_date', today.toISOString().split('T')[0])
      .order('end_date', { ascending: true }),
    admin.from('organizations').select('name, default_currency').eq('id', orgId).single(),
  ])

  const orgName = (orgRes.data?.name as string) ?? ''
  const currency = (orgRes.data?.default_currency as string) ?? 'OMR'
  const contracts = (contractsRes.data ?? []) as {
    id: string; end_date: string; rent_amount: number; currency: string; status: string;
    tenants: { full_name: string; email: string; phone: string } | null;
    units: { unit_number: string; properties: { name: string } | null } | null;
  }[]

  function bucket(days: number) {
    if (days <= 30)  return { label: 'Within 30 days', color: 'red',    bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700' }
    if (days <= 60)  return { label: '31-60 days',     color: 'orange',  bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' }
    if (days <= 90)  return { label: '61-90 days',     color: 'amber',   bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700' }
    return            { label: '91-180 days',           color: 'blue',    bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700' }
  }

  const rows = contracts.map(c => ({
    ...c,
    daysLeft: daysBetween(today, new Date(c.end_date)),
    bucket: bucket(daysBetween(today, new Date(c.end_date))),
  }))

  const b30 = rows.filter(r => r.daysLeft <= 30).length
  const b60 = rows.filter(r => r.daysLeft > 30 && r.daysLeft <= 60).length
  const b90 = rows.filter(r => r.daysLeft > 60 && r.daysLeft <= 90).length
  const b180 = rows.filter(r => r.daysLeft > 90).length

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Lease Renewal Pipeline</h2>
          <p className="text-slate-500 text-sm mt-0.5">Active contracts expiring within 6 months — act before vacancies occur</p>
        </div>
        <PrintButton />
      </div>
      <PrintHeader reportTitle="Lease Renewal Pipeline" orgName={orgName} userName={userName} printDate={printDate} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Within 30 days', value: b30,  color: 'text-red-600' },
          { label: '31–60 days',     value: b60,  color: 'text-orange-600' },
          { label: '61–90 days',     value: b90,  color: 'text-amber-600' },
          { label: '91–180 days',    value: b180, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <CalendarCheck size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Expiring Leases ({rows.length})</h3>
        </div>
        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No leases expiring in the next 6 months.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Tenant</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Unit</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Property</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Expiry Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Days Left</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Rent / Month</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.tenants?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.units?.unit_number ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.units?.properties?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(r.end_date).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.bucket.badge}`}>
                        {r.daysLeft}d
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {r.rent_amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {r.currency}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{r.tenants?.phone ?? r.tenants?.email ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
