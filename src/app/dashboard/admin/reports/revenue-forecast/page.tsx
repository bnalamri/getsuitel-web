import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getMyBranchId } from '@/lib/admin-branch'
import { AlertTriangle, TrendingUp, RefreshCw, Coins } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'
import ExcelExportButton from './ExcelExportButton'

export const metadata = { title: 'Subscription Revenue Forecast' }
export const dynamic = 'force-dynamic'

// Subscription plan prices
const PLAN_PRICES: Record<string, number> = {
  basic:      49,
  pro:        99,
  enterprise: 199,
  free:       0,
}

function fmtCurrency(n: number, currency: string) {
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`
}

function fmtDate(iso: string, fmt: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  if (fmt === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`
  if (fmt === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`
  return `${dd}/${mm}/${yyyy}` // DD/MM/YYYY default
}

export default async function RevenueForecastPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: adminProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const printerName = (adminProfile?.full_name as string) || user.email || 'Superadmin'

  const admin = createAdminClient()
  const branchId = await getMyBranchId()
  const today = new Date()
  const printDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  // Read currency + date format from platform settings
  const [currencyRow, dateFormatRow] = await Promise.all([
    admin.from('platform_settings').select('value').eq('key', 'default_currency').maybeSingle(),
    admin.from('platform_settings').select('value').eq('key', 'default_date_format').maybeSingle(),
  ])
  const adminCurrency = (currencyRow.data?.value as string) ?? 'OMR'
  const adminDateFormat = (dateFormatRow.data?.value as string) ?? 'DD/MM/YYYY'

  const orgQ = admin
    .from('organizations')
    .select('id, name, subscription_plan, subscription_status, subscription_expires_at')
    .not('subscription_status', 'in', '("canceled")')
    .order('subscription_expires_at', { ascending: true })
  const { data: orgs } = await (branchId ? orgQ.eq('branch_id', branchId) : orgQ)

  const orgList = (orgs ?? []) as {
    id: string; name: string; subscription_plan: string;
    subscription_status: string; subscription_expires_at: string | null;
  }[]

  // Current MRR
  const mrr = orgList
    .filter(o => o.subscription_status === 'active')
    .reduce((s, o) => s + (PLAN_PRICES[o.subscription_plan] ?? 0), 0)

  // Build 12-month forecast
  const months: { key: string; label: string; renewals: number; atRisk: number; expectedMRR: number }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + i + 1, 0)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' })

    const expiringThisMonth = orgList.filter(o => {
      if (!o.subscription_expires_at) return false
      const exp = new Date(o.subscription_expires_at)
      return exp >= d && exp <= monthEnd
    })

    const renewals = expiringThisMonth.filter(o => o.subscription_status === 'active').length
    const atRisk = expiringThisMonth.filter(o => o.subscription_status === 'past_due').length
    // Assume 80% renewal rate for active, 40% for past_due
    const expectedRevenue = expiringThisMonth.reduce((s, o) => {
      const price = PLAN_PRICES[o.subscription_plan] ?? 0
      const rate = o.subscription_status === 'active' ? 0.8 : 0.4
      return s + price * rate
    }, 0)

    months.push({ key, label, renewals, atRisk, expectedMRR: Math.round(expectedRevenue) })
  }

  const totalExpected12m = months.reduce((s, m) => s + m.expectedMRR, 0)

  // Expiring in 30 days
  const in30 = new Date(today.getTime() + 30 * 86400000)
  const expiring30 = orgList.filter(o => o.subscription_expires_at && new Date(o.subscription_expires_at) <= in30 && new Date(o.subscription_expires_at) >= today)

  // Plan breakdown for current MRR
  const byPlan: Record<string, { count: number; mrr: number }> = {}
  for (const o of orgList.filter(o => o.subscription_status === 'active')) {
    const plan = o.subscription_plan
    if (!byPlan[plan]) byPlan[plan] = { count: 0, mrr: 0 }
    byPlan[plan].count++
    byPlan[plan].mrr += PLAN_PRICES[plan] ?? 0
  }

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Subscription Revenue Forecast</h2>
          <p className="text-slate-500 text-sm mt-0.5">Projected MRR from renewals and upcoming expiry dates — next 12 months</p>
        </div>
        <div className="flex items-center gap-2">
          <ExcelExportButton
            mrr={mrr} arr={mrr * 12} totalExpected12m={totalExpected12m}
            expiring30Count={expiring30.length}
            byPlan={byPlan} months={months} expiring30={expiring30}
            currency={adminCurrency}
          />
          <PrintButton />
        </div>
      </div>
      <PrintHeader reportTitle="Subscription Revenue Forecast" orgName="GetSuitel" userName={printerName} printDate={printDate} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Current MRR',         value: fmtCurrency(mrr, adminCurrency),              color: 'text-emerald-700', icon: Coins },
          { label: 'ARR (×12)',            value: fmtCurrency(mrr * 12, adminCurrency),         color: 'text-blue-700',    icon: TrendingUp },
          { label: 'Expiring in 30 days', value: expiring30.length.toString(), color: 'text-amber-600', icon: AlertTriangle },
          { label: '12-Month Forecast',   value: fmtCurrency(totalExpected12m, adminCurrency), color: 'text-purple-700',  icon: RefreshCw },
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

      {/* MRR by plan */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Current MRR by Plan</h3>
        <div className="space-y-3">
          {Object.entries(byPlan).map(([plan, data]) => (
            <div key={plan}>
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize font-medium text-slate-700">{plan} × {data.count} orgs</span>
                <span className="font-bold text-emerald-700">{fmtCurrency(data.mrr, adminCurrency)}/mo</span>
              </div>
              <div className="bg-slate-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, (data.mrr / (mrr || 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
          {Object.keys(byPlan).length === 0 && <p className="text-sm text-slate-400">No active subscriptions.</p>}
        </div>
      </div>

      {/* 12-month forecast table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">12-Month Renewal Forecast</h3>
          <p className="text-xs text-slate-400 mt-0.5">Assumes 80% renewal rate for active, 40% for past-due subscriptions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Month</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Renewals Due</th>
                <th className="px-4 py-3 font-semibold text-slate-600">At Risk</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Expected Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {months.map((m, i) => (
                <tr key={m.key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                  <td className="px-4 py-3 font-medium text-slate-800">{m.label}</td>
                  <td className="px-4 py-3 text-blue-700 font-semibold">{m.renewals}</td>
                  <td className="px-4 py-3">
                    {m.atRisk > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">⚠ {m.atRisk}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">{m.expectedMRR > 0 ? fmtCurrency(m.expectedMRR, adminCurrency) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold">
                <td colSpan={3} className="px-4 py-3 text-slate-700">12-Month Expected Revenue</td>
                <td className="px-4 py-3 text-emerald-700">{fmtCurrency(totalExpected12m, adminCurrency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Expiring in 30 days detail */}
      {expiring30.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-200 bg-amber-50 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">Expiring Within 30 Days ({expiring30.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Organization</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Plan</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Expires</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiring30.map((o, i) => {
                  const daysLeft = Math.ceil((new Date(o.subscription_expires_at!).getTime() - today.getTime()) / 86400000)
                  return (
                    <tr key={o.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="px-4 py-3 font-medium text-slate-800">{o.name}</td>
                      <td className="px-4 py-3 capitalize text-slate-600">{o.subscription_plan}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${o.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {o.subscription_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${daysLeft <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                          {fmtDate(o.subscription_expires_at!, adminDateFormat)} ({daysLeft}d)
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{fmtCurrency(PLAN_PRICES[o.subscription_plan] ?? 0, adminCurrency)}/mo</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
