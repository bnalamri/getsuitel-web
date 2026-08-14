import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Building2, Clock, AlertTriangle, TrendingDown } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'

export const metadata = { title: 'Vacancy Duration Report' }
export const dynamic = 'force-dynamic'

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000))
}

function fmtAmt(n: number, currency = 'OMR') {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}

export default async function VacancyReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id, full_name').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return null
  const userName = (profile?.full_name as string) || user.email || ''

  const admin = createAdminClient()
  const today = new Date()
  const printDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const [unitsRes, contractsRes, orgRes] = await Promise.all([
    admin.from('units').select('id, unit_number, status, property_id, properties(id, name)').eq('organization_id', orgId),
    admin.from('contracts').select('unit_id, end_date, rent_amount, currency, status').eq('organization_id', orgId).order('end_date', { ascending: false }),
    admin.from('organizations').select('name, default_currency').eq('id', orgId).single(),
  ])

  const currency = (orgRes.data?.default_currency as string) ?? 'OMR'
  const orgName = (orgRes.data?.name as string) ?? ''

  const units = (unitsRes.data ?? []) as {id:string,unit_number:string,status:string,property_id:string,properties:{name:string}|null}[]
  const contracts = (contractsRes.data ?? []) as {unit_id:string,end_date:string,rent_amount:number,currency:string,status:string}[]

  // For each vacant unit, find last contract end_date to estimate vacancy start
  const vacantUnits = units.filter(u => u.status === 'vacant')

  const rows = vacantUnits.map(unit => {
    const unitContracts = contracts.filter(c => c.unit_id === unit.id)
    const lastContract = unitContracts[0]
    const vacantSince = lastContract?.end_date ? new Date(lastContract.end_date) : null
    const daysVacant = vacantSince ? daysBetween(vacantSince, today) : null
    const monthlyRent = lastContract?.rent_amount ?? 0
    const lostRent = daysVacant != null ? (monthlyRent / 30) * daysVacant : 0
    return { unit, vacantSince, daysVacant, monthlyRent, lostRent, currency: lastContract?.currency ?? currency }
  }).sort((a, b) => (b.daysVacant ?? 0) - (a.daysVacant ?? 0))

  const totalLost = rows.reduce((s, r) => s + r.lostRent, 0)
  const critical = rows.filter(r => (r.daysVacant ?? 0) >= 90).length
  const warning = rows.filter(r => (r.daysVacant ?? 0) >= 30 && (r.daysVacant ?? 0) < 90).length

  function urgencyBadge(days: number | null) {
    if (days == null) return <span className="text-xs text-slate-400">Unknown</span>
    if (days >= 90) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">🔴 {days}d</span>
    if (days >= 30) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">🟡 {days}d</span>
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">🟢 {days}d</span>
  }

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Vacancy Duration Report</h2>
          <p className="text-slate-500 text-sm mt-0.5">Days each unit has been vacant and estimated revenue lost</p>
        </div>
        <PrintButton />
      </div>
      <PrintHeader reportTitle="Vacancy Duration Report" orgName={orgName} userName={userName} printDate={printDate} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Vacant Units',        value: vacantUnits.length.toString(), color: 'text-slate-700', icon: Building2 },
          { label: 'Critical (90+ days)', value: critical.toString(),            color: 'text-red-600',   icon: AlertTriangle },
          { label: 'Warning (30-90d)',    value: warning.toString(),             color: 'text-amber-600', icon: Clock },
          { label: 'Est. Revenue Lost',   value: fmtAmt(totalLost, currency),   color: 'text-red-700',   icon: TrendingDown },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <s.icon size={20} className={s.color} />
            <div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Building2 size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Vacant Units Detail</h3>
        </div>
        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">No vacant units found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Unit</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Property</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Vacant Since</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Days Vacant</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Last Rent/mo</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Est. Lost Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={r.unit.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.unit.unit_number}</td>
                    <td className="px-4 py-3 text-slate-600">{(r.unit.properties as {name:string}|null)?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{r.vacantSince ? r.vacantSince.toLocaleDateString('en-GB') : '—'}</td>
                    <td className="px-4 py-3">{urgencyBadge(r.daysVacant)}</td>
                    <td className="px-4 py-3 text-slate-600">{r.monthlyRent > 0 ? fmtAmt(r.monthlyRent, r.currency) : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-red-600">{r.lostRent > 0 ? fmtAmt(r.lostRent, r.currency) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={5} className="px-4 py-3 text-slate-700">Total Estimated Revenue Lost</td>
                  <td className="px-4 py-3 text-red-700">{fmtAmt(totalLost, currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
