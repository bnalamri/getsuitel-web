import { createClient, createAdminClient } from '@/lib/supabase/server'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'
import PropertySelectClient from '@/components/PropertySelectClient'
import CashFlowExcelButton from './ExcelExportButton'
import OmrAmount from '@/components/OmrAmount'

export const metadata = { title: 'Cash Flow Forecast' }
export const dynamic = 'force-dynamic'

function fmtAmt(n: number, currency = 'OMR') {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}

export default async function CashFlowForecastPage({ searchParams }: { searchParams: Promise<{ property_id?: string }> }) {
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

  const [contractsRes, expensesRes, orgRes, propertiesRes] = await Promise.all([
    admin.from('contracts')
      .select('id, rent_amount, currency, status, end_date, units(unit_number, property_id, properties(name))')
      .eq('organization_id', orgId)
      .eq('status', 'active'),
    admin.from('expenses')
      .select('id, amount, currency, date, category, property_id')
      .eq('organization_id', orgId)
      .gte('date', new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().split('T')[0]),
    admin.from('organizations').select('name, default_currency').eq('id', orgId).single(),
    admin.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
  ])

  const currency = (orgRes.data?.default_currency as string) ?? 'OMR'
  const orgName = (orgRes.data?.name as string) ?? ''
  const properties = (propertiesRes.data ?? []) as { id: string; name: string }[]

  const allContracts = (contractsRes.data ?? []) as {
    id: string; rent_amount: number; currency: string; end_date: string;
    units: { unit_number: string; property_id: string; properties: { name: string } | null } | null;
  }[]
  const allExpenses = (expensesRes.data ?? []) as { id: string; amount: number; currency: string; date: string; category: string; property_id: string | null }[]

  const contracts = propertyId ? allContracts.filter(c => (c.units as any)?.property_id === propertyId) : allContracts
  const expenses = propertyId ? allExpenses.filter(e => e.property_id === propertyId) : allExpenses

  const expTotal = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const avgMonthlyExpenses = expTotal / 3

  const months: { label: string; key: string; income: number; expenses: number; net: number; contractsActive: number }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
    const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const active = contracts.filter(c => new Date(c.end_date) >= d).length
    const inc = contracts.filter(c => new Date(c.end_date) >= d).reduce((s, c) => s + (c.rent_amount ?? 0), 0)
    months.push({ label, key, income: inc, expenses: avgMonthlyExpenses, net: inc - avgMonthlyExpenses, contractsActive: active })
  }

  const totalForecastIncome = months.reduce((s, m) => s + m.income, 0)
  const totalForecastExpenses = months.reduce((s, m) => s + m.expenses, 0)
  const totalNet = totalForecastIncome - totalForecastExpenses
  const maxIncome = Math.max(...months.map(m => m.income), 1)

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cash Flow Forecast</h2>
          <p className="text-slate-500 text-sm mt-0.5">Projected income vs expenses for the next 6 months based on active contracts</p>
        </div>
        <div className="flex items-center gap-2">
          <PropertySelectClient properties={properties} selectedId={propertyId} />
          <CashFlowExcelButton months={months} currency={currency} totalForecastIncome={totalForecastIncome} totalForecastExpenses={totalForecastExpenses} totalNet={totalNet} />
          <PrintButton />
        </div>
      </div>
      <PrintHeader reportTitle="Cash Flow Forecast" orgName={orgName} userName={userName} printDate={printDate} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Projected 6-Month Income',    value: fmtAmt(totalForecastIncome, currency),   color: 'text-emerald-700', icon: TrendingUp },
          { label: 'Projected 6-Month Expenses',  value: fmtAmt(totalForecastExpenses, currency), color: 'text-red-600',     icon: TrendingDown },
          { label: 'Projected Net Cash Flow',     value: fmtAmt(totalNet, currency),              color: totalNet >= 0 ? 'text-emerald-700' : 'text-red-700', icon: DollarSign },
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

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">6-Month Projection</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Month</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Active Contracts</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Expected Income</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Est. Expenses</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Net Cash Flow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {months.map((m, i) => (
                <tr key={m.key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                  <td className="px-4 py-3 font-medium text-slate-800">{m.label}</td>
                  <td className="px-4 py-3 text-slate-600">{m.contractsActive}</td>
                  <td className="px-4 py-3 text-emerald-700 font-semibold"><OmrAmount value={m.income} /></td>
                  <td className="px-4 py-3 text-red-600"><OmrAmount value={m.expenses} /></td>
                  <td className={`px-4 py-3 font-bold ${m.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {m.net >= 0 ? '+' : ''}{fmtAmt(m.net, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold">
                <td className="px-4 py-3 text-slate-700">6-Month Total</td>
                <td className="px-4 py-3 text-slate-500">—</td>
                <td className="px-4 py-3 text-emerald-700"><OmrAmount value={totalForecastIncome} /></td>
                <td className="px-4 py-3 text-red-600"><OmrAmount value={totalForecastExpenses} /></td>
                <td className={`px-4 py-3 ${totalNet >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{totalNet >= 0 ? '+' : ''}{fmtAmt(totalNet, currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Income vs Expenses — Visual</h3>
        <div className="flex items-end gap-3 h-40">
          {months.map(m => (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-end gap-0.5 h-32 w-full">
                <div className="flex-1 bg-emerald-400 rounded-t" style={{ height: `${Math.round((m.income / maxIncome) * 100)}%` }} title={`Income: ${fmtAmt(m.income, currency)}`} />
                <div className="flex-1 bg-red-300 rounded-t" style={{ height: `${Math.round((m.expenses / maxIncome) * 100)}%` }} title={`Expenses: ${fmtAmt(m.expenses, currency)}`} />
              </div>
              <span className="text-xs text-slate-500">{m.label.split(' ')[0]}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 justify-center text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 rounded inline-block" /> Income</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-300 rounded inline-block" /> Expenses (avg)</span>
        </div>
        <p className="text-xs text-slate-400 mt-3 text-center">Expenses estimated from 3-month average. Income based on active contracts only.</p>
      </div>
    </div>
  )
}
