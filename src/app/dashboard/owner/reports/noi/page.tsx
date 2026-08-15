import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Building2 } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'
import PropertySelectClient from '@/components/PropertySelectClient'
import NOIExcelButton from './ExcelExportButton'
import OmrAmount from '@/components/OmrAmount'

export const metadata = { title: 'NOI Report' }
export const dynamic = 'force-dynamic'

function fmtAmt(n: number, currency = 'OMR') {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}

export default async function NOIReportPage({ searchParams }: { searchParams: Promise<{ property_id?: string }> }) {
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
  const yearEnd = `${year}-12-31`

  const [propertiesRes, invoicesRes, expensesRes, maintRes, orgRes] = await Promise.all([
    admin.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
    admin.from('invoices')
      .select('amount, currency, status, unit_id, units(property_id)')
      .eq('organization_id', orgId).eq('status', 'paid').gte('created_at', yearStart).lte('created_at', yearEnd),
    admin.from('expenses')
      .select('amount, currency, property_id')
      .eq('organization_id', orgId).gte('date', yearStart).lte('date', yearEnd),
    admin.from('maintenance_requests')
      .select('charge_amount, unit_id, units(property_id)')
      .eq('organization_id', orgId).not('charge_amount', 'is', null),
    admin.from('organizations').select('name, default_currency').eq('id', orgId).single(),
  ])

  const currency = (orgRes.data?.default_currency as string) ?? 'OMR'
  const orgName = (orgRes.data?.name as string) ?? ''
  const allProperties = (propertiesRes.data ?? []) as { id: string; name: string }[]
  const invoices = (invoicesRes.data ?? []) as { amount: number; units: { property_id: string } | null }[]
  const expenses = (expensesRes.data ?? []) as { amount: number; property_id: string | null }[]
  const maint = (maintRes.data ?? []) as { charge_amount: number; units: { property_id: string } | null }[]

  // Filter by property if selected
  const properties = propertyId ? allProperties.filter(p => p.id === propertyId) : allProperties

  const propData = properties.map(p => {
    const income = invoices.filter(inv => inv.units?.property_id === p.id).reduce((s, inv) => s + inv.amount, 0)
    const expCost = expenses.filter(e => e.property_id === p.id).reduce((s, e) => s + e.amount, 0)
    const maintCost = maint.filter(m => m.units?.property_id === p.id).reduce((s, m) => s + (m.charge_amount ?? 0), 0)
    const totalExpenses = expCost + maintCost
    const noi = income - totalExpenses
    return { ...p, income, totalExpenses, expCost, maintCost, noi }
  })

  const totalIncome = propData.reduce((s, p) => s + p.income, 0)
  const totalExpenses = propData.reduce((s, p) => s + p.totalExpenses, 0)
  const totalNOI = totalIncome - totalExpenses
  const noiMargin = totalIncome > 0 ? ((totalNOI / totalIncome) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">NOI Report — Net Operating Income</h2>
          <p className="text-slate-500 text-sm mt-0.5">Gross rental income minus operating expenses per property · {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <PropertySelectClient properties={allProperties} selectedId={propertyId} />
          <NOIExcelButton propData={propData} currency={currency} totalIncome={totalIncome} totalExpenses={totalExpenses} totalNOI={totalNOI} noiMargin={noiMargin} year={year} />
          <PrintButton />
        </div>
      </div>
      <PrintHeader reportTitle={`NOI Report ${year}`} orgName={orgName} userName={userName} printDate={printDate} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-emerald-700"><OmrAmount value={totalIncome} /></div>
          <div className="text-xs text-slate-500 mt-1">Gross Income</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-red-600"><OmrAmount value={totalExpenses} /></div>
          <div className="text-xs text-slate-500 mt-1">Total Expenses</div>
        </div>
        <div className="card p-4">
          <div className={`text-2xl font-bold ${totalNOI >= 0 ? 'text-emerald-700' : 'text-red-700'}`}><OmrAmount value={totalNOI} /></div>
          <div className="text-xs text-slate-500 mt-1">Net Operating Income</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-blue-700">{noiMargin}%</div>
          <div className="text-xs text-slate-500 mt-1">NOI Margin</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Building2 size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">NOI by Property</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Property</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Gross Income</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Expenses</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Maint. Costs</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Total Costs</th>
                <th className="px-4 py-3 font-semibold text-slate-600">NOI</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {propData.map((p, i) => {
                const margin = p.income > 0 ? ((p.noi / p.income) * 100).toFixed(1) : '—'
                return (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold"><OmrAmount value={p.income} /></td>
                    <td className="px-4 py-3 text-red-600"><OmrAmount value={p.expCost} /></td>
                    <td className="px-4 py-3 text-orange-600"><OmrAmount value={p.maintCost} /></td>
                    <td className="px-4 py-3 text-red-700 font-semibold"><OmrAmount value={p.totalExpenses} /></td>
                    <td className={`px-4 py-3 font-bold ${p.noi >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      <span className="inline-flex items-center gap-0.5">
                        {p.noi >= 0 ? '+' : ''}
                        <OmrAmount value={p.noi} />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{margin !== '—' ? `${margin}%` : '—'}</td>
                  </tr>
                )
              })}
              {propData.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No data found for {year}.</td></tr>
              )}
            </tbody>
            {propData.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td className="px-4 py-3 text-slate-700">Total</td>
                  <td className="px-4 py-3 text-emerald-700"><OmrAmount value={totalIncome} /></td>
                  <td colSpan={3} className="px-4 py-3 text-red-700"><OmrAmount value={totalExpenses} /> total</td>
                  <td className={`px-4 py-3 ${totalNOI >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    <span className="inline-flex items-center gap-0.5">
                      {totalNOI >= 0 ? '+' : ''}
                      <OmrAmount value={totalNOI} />
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{noiMargin}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
