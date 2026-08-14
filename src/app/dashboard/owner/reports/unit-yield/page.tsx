import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Building2, Info } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'
import PropertySelectClient from '@/components/PropertySelectClient'
import UnitYieldExcelButton from './ExcelExportButton'

export const metadata = { title: 'Unit Yield Report' }
export const dynamic = 'force-dynamic'

function fmtAmt(n: number, currency = 'OMR') {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}

export default async function UnitYieldPage({ searchParams }: { searchParams: Promise<{ property_id?: string }> }) {
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
  const sp = await searchParams
  const propertyId = sp?.property_id ?? ''
  const year = today.getFullYear()
  const yearStart = `${year}-01-01`

  const [unitsRes, contractsRes, invoicesRes, orgRes, propertiesRes] = await Promise.all([
    admin.from('units').select('id, unit_number, status, property_id, properties(name)').eq('organization_id', orgId).order('unit_number'),
    admin.from('contracts').select('unit_id, rent_amount, currency, status, start_date, end_date').eq('organization_id', orgId).eq('status', 'active'),
    admin.from('invoices').select('amount, currency, status, unit_id').eq('organization_id', orgId).eq('status', 'paid').gte('created_at', yearStart),
    admin.from('organizations').select('name, default_currency').eq('id', orgId).single(),
    admin.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
  ])

  const currency = (orgRes.data?.default_currency as string) ?? 'OMR'
  const orgName = (orgRes.data?.name as string) ?? ''
  const properties = (propertiesRes.data ?? []) as { id: string; name: string }[]

  const allUnits = (unitsRes.data ?? []) as { id: string; unit_number: string; status: string; property_id: string; properties: { name: string } | null }[]
  const contracts = (contractsRes.data ?? []) as { unit_id: string; rent_amount: number; currency: string; status: string }[]
  const invoices = (invoicesRes.data ?? []) as { amount: number; currency: string; status: string; unit_id: string }[]

  const units = propertyId ? allUnits.filter(u => u.property_id === propertyId) : allUnits

  const rows = units.map(unit => {
    const contract = contracts.find(c => c.unit_id === unit.id)
    const monthlyRent = contract?.rent_amount ?? 0
    const annualRent = monthlyRent * 12
    const ytdCollected = invoices.filter(inv => inv.unit_id === unit.id).reduce((s, inv) => s + inv.amount, 0)
    return { unit, monthlyRent, annualRent, ytdCollected, contract }
  }).sort((a, b) => b.annualRent - a.annualRent)

  const totalAnnual = rows.reduce((s, r) => s + r.annualRent, 0)
  const totalYTD = rows.reduce((s, r) => s + r.ytdCollected, 0)
  const occupied = rows.filter(r => r.unit.status === 'occupied').length

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Unit Yield Report</h2>
          <p className="text-slate-500 text-sm mt-0.5">Annual rent income per unit and year-to-date collection performance · {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <PropertySelectClient properties={properties} selectedId={propertyId} />
          <UnitYieldExcelButton rows={rows} currency={currency} totalAnnual={totalAnnual} totalYTD={totalYTD} year={year} />
          <PrintButton />
        </div>
      </div>
      <PrintHeader reportTitle={`Unit Yield Report ${year}`} orgName={orgName} userName={userName} printDate={printDate} />

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3 items-start no-print">
        <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          <strong>Yield %</strong> = Annual Rent ÷ Estimated Property Value × 100.
          This report shows annual rent income and YTD collection performance.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Units',        value: units.length.toString(),       color: 'text-slate-700' },
          { label: 'Occupied',           value: occupied.toString(),            color: 'text-emerald-700' },
          { label: 'Annual Rent Income', value: fmtAmt(totalAnnual, currency), color: 'text-blue-700' },
          { label: 'YTD Collected',      value: fmtAmt(totalYTD, currency),    color: 'text-emerald-700' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Building2 size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Unit Yield Detail</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Unit</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Property</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Monthly Rent</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Annual Rent</th>
                <th className="px-4 py-3 font-semibold text-slate-600">YTD Collected</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Collection Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => {
                const rate = r.annualRent > 0 ? Math.min(100, Math.round((r.ytdCollected / (r.annualRent / 12 * (today.getMonth() + 1))) * 100)) : 0
                return (
                  <tr key={r.unit.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.unit.unit_number}</td>
                    <td className="px-4 py-3 text-slate-600">{(r.unit.properties as any)?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.unit.status === 'occupied' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {r.unit.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.monthlyRent > 0 ? fmtAmt(r.monthlyRent, currency) : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700">{r.annualRent > 0 ? fmtAmt(r.annualRent, currency) : '—'}</td>
                    <td className="px-4 py-3 text-emerald-700">{r.ytdCollected > 0 ? fmtAmt(r.ytdCollected, currency) : '—'}</td>
                    <td className="px-4 py-3">
                      {r.annualRent > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 min-w-[60px]">
                            <div className={`h-1.5 rounded-full ${rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{rate}%</span>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No units found.</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={4} className="px-4 py-3 text-slate-700">Portfolio Total</td>
                  <td className="px-4 py-3 text-blue-700">{fmtAmt(totalAnnual, currency)}</td>
                  <td className="px-4 py-3 text-emerald-700">{fmtAmt(totalYTD, currency)}</td>
                  <td className="px-4 py-3 text-slate-500">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
