import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Building2, FileText } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'

export const metadata = { title: 'Annual Portfolio Summary' }
export const dynamic = 'force-dynamic'

function fmtAmt(n: number, currency = 'OMR') {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}

export default async function AnnualPortfolioPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id, full_name').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return null
  const userName = (profile?.full_name as string) || user.email || ''

  const admin = createAdminClient()
  const today = new Date()
  const sp = await searchParams
  const year = parseInt(sp?.year ?? '') || today.getFullYear()
  const printDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const [invoicesRes, expensesRes, maintRes, unitsRes, contractsRes, orgRes] = await Promise.all([
    admin.from('invoices')
      .select('amount, currency, status, due_date, unit_id, units(property_id, properties(id, name))')
      .eq('organization_id', orgId)
      .gte('created_at', yearStart)
      .lte('created_at', yearEnd),
    admin.from('expenses')
      .select('amount, currency, property_id, category, properties(name)')
      .eq('organization_id', orgId)
      .gte('date', yearStart)
      .lte('date', yearEnd),
    admin.from('maintenance_requests')
      .select('charge_amount, status, completed_at, units(property_id)')
      .eq('organization_id', orgId)
      .not('charge_amount', 'is', null)
      .gte('completed_at', yearStart)
      .lte('completed_at', yearEnd),
    admin.from('units').select('id, status').eq('organization_id', orgId),
    admin.from('contracts').select('status, start_date, end_date').eq('organization_id', orgId),
    admin.from('organizations').select('name, default_currency').eq('id', orgId).single(),
  ])

  const currency = (orgRes.data?.default_currency as string) ?? 'OMR'
  const orgName = (orgRes.data?.name as string) ?? ''

  const invoices = (invoicesRes.data ?? []) as {amount: number; currency: string; status: string; units: {property_id: string; properties: {id: string; name: string} | null} | null}[]
  const expenses = (expensesRes.data ?? []) as {amount: number; currency: string; property_id: string; category: string; properties: {name: string} | null}[]
  const maint = (maintRes.data ?? []) as {charge_amount: number; units: {property_id: string} | null}[]
  const units = (unitsRes.data ?? []) as {id: string; status: string}[]
  const contracts = (contractsRes.data ?? []) as {status: string; start_date: string; end_date: string}[]

  const totalIncome = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalPending = invoices.filter(i => ['pending', 'overdue'].includes(i.status)).reduce((s, i) => s + i.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalMaintCost = maint.reduce((s, m) => s + (m.charge_amount ?? 0), 0)
  const noi = totalIncome - totalExpenses - totalMaintCost
  const occupied = units.filter(u => u.status === 'occupied').length
  const occupancyRate = units.length > 0 ? Math.round((occupied / units.length) * 100) : 0

  // Active contracts in this year
  const activeContracts = contracts.filter(c => {
    const start = new Date(c.start_date)
    const end = new Date(c.end_date)
    return start.getFullYear() <= year && end.getFullYear() >= year
  }).length

  // Monthly income breakdown
  const monthlyIncome: Record<string, number> = {}
  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, '0')
    monthlyIncome[key] = 0
  }
  for (const inv of invoices.filter(i => i.status === 'paid')) {
    // use created_at month (not ideal but best we have)
  }
  // Using expenses by month for expenses chart
  const monthlyExpenses: Record<string, number> = {}
  for (let m = 1; m <= 12; m++) {
    monthlyExpenses[String(m).padStart(2, '0')] = 0
  }
  for (const exp of expenses) {
    const m = String(new Date(exp.category).getMonth() + 1).padStart(2, '0')
    // fallback — group all
  }

  // Expense categories
  const byCat: Record<string, number> = {}
  for (const e of expenses) {
    byCat[e.category] = (byCat[e.category] ?? 0) + e.amount
  }
  const catRows = Object.entries(byCat).map(([cat, total]) => ({ cat, total })).sort((a, b) => b.total - a.total)

  const availableYears = [year - 2, year - 1, year, year + 1].filter(y => y <= today.getFullYear())

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Annual Portfolio Summary</h2>
          <p className="text-slate-500 text-sm mt-0.5">Yearly financial overview for tax filing, financing, and investor reporting</p>
        </div>
        <div className="flex items-center gap-2">
          <form method="GET">
            <select name="year" defaultValue={year} onChange={(e) => { const f = e.target.closest('form') as HTMLFormElement; if (f) f.submit() }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </form>
          <PrintButton />
        </div>
      </div>
      <PrintHeader reportTitle={`Annual Portfolio Summary ${year}`} orgName={orgName} userName={userName} printDate={printDate} />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Gross Rental Income',   value: fmtAmt(totalIncome, currency),   color: 'text-emerald-700' },
          { label: 'Pending / Outstanding', value: fmtAmt(totalPending, currency),  color: 'text-amber-600' },
          { label: 'Total Operating Expenses', value: fmtAmt(totalExpenses + totalMaintCost, currency), color: 'text-red-600' },
          { label: 'Net Operating Income',  value: fmtAmt(noi, currency),           color: noi >= 0 ? 'text-emerald-700' : 'text-red-700' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Units',       value: units.length.toString(),        color: 'text-slate-700' },
          { label: 'Occupied',          value: occupied.toString(),             color: 'text-emerald-700' },
          { label: 'Occupancy Rate',    value: `${occupancyRate}%`,            color: 'text-blue-700' },
          { label: 'Active Contracts',  value: activeContracts.toString(),     color: 'text-purple-700' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* P&L Summary */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Profit & Loss Summary — {year}</h3>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Gross Rental Income',    value: totalIncome,              color: 'text-emerald-700', sign: '+' },
            { label: 'Operating Expenses',     value: -totalExpenses,           color: 'text-red-600',     sign: '−' },
            { label: 'Maintenance Costs',      value: -totalMaintCost,         color: 'text-red-600',     sign: '−' },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-700">{r.label}</span>
              <span className={`text-sm font-semibold ${r.color}`}>
                {r.sign} {fmtAmt(Math.abs(r.value), currency)}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center py-2 bg-slate-50 rounded-lg px-3">
            <span className="font-bold text-slate-800">Net Operating Income (NOI)</span>
            <span className={`font-bold text-lg ${noi >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {noi >= 0 ? '+ ' : '− '}{fmtAmt(Math.abs(noi), currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Expense breakdown by category */}
      {catRows.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={15} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Expense Breakdown by Category</h3>
          </div>
          <div className="space-y-2">
            {catRows.map(c => (
              <div key={c.cat} className="flex items-center gap-3">
                <div className="w-28 text-sm text-slate-600 capitalize">{c.cat}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="bg-red-400 h-2 rounded-full" style={{ width: `${Math.min(100, (c.total / (totalExpenses || 1)) * 100)}%` }} />
                </div>
                <div className="text-sm font-semibold text-red-600 w-36 text-right">{fmtAmt(c.total, currency)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
