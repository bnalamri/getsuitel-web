import { createClient, createAdminClient } from '@/lib/supabase/server'
import { CreditCard, AlertTriangle } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'
import PropertySelectClient from '@/components/PropertySelectClient'
import PaymentAgingExcelButton from './ExcelExportButton'
import OmrAmount from '@/components/OmrAmount'

export const metadata = { title: 'Payment Aging Report' }
export const dynamic = 'force-dynamic'

function fmtAmt(n: number, currency = 'OMR') {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' ' + currency
}

export default async function PaymentAgingPage({ searchParams }: { searchParams: Promise<{ property_id?: string }> }) {
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

  const [invoicesRes, orgRes, propertiesRes] = await Promise.all([
    admin.from('invoices')
      .select('id, amount, currency, status, due_date, type, tenants(full_name), units(unit_number, property_id, properties(id, name))')
      .eq('organization_id', orgId)
      .or('status.eq.overdue,status.eq.pending')
      .order('due_date', { ascending: true }),
    admin.from('organizations').select('name, default_currency').eq('id', orgId).single(),
    admin.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
  ])

  const currency = (orgRes.data?.default_currency as string) ?? 'OMR'
  const orgName = (orgRes.data?.name as string) ?? ''
  const properties = (propertiesRes.data ?? []) as { id: string; name: string }[]

  type Inv = {
    id: string; amount: number; currency: string; status: string; due_date: string; type: string;
    tenants: { full_name: string } | null;
    units: { unit_number: string; property_id: string; properties: { id: string; name: string } | null } | null;
  }
  const allInvoices = (invoicesRes.data ?? []) as Inv[]
  const invoices = propertyId
    ? allInvoices.filter(inv => (inv.units as any)?.property_id === propertyId)
    : allInvoices

  function daysPastDue(due: string) {
    const d = new Date(due)
    if (d > today) return 0
    return Math.floor((today.getTime() - d.getTime()) / 86400000)
  }

  const rows = invoices
    .filter(inv => new Date(inv.due_date) <= today)
    .map(inv => ({ ...inv, daysPast: daysPastDue(inv.due_date) }))
    .sort((a, b) => b.daysPast - a.daysPast)

  const buckets = [
    { label: '1–30 days',  min: 1,  max: 30,   border: 'border-amber-200',  bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-800',  total: 0, count: 0 },
    { label: '31–60 days', min: 31, max: 60,   border: 'border-orange-200', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-800', total: 0, count: 0 },
    { label: '61–90 days', min: 61, max: 90,   border: 'border-red-200',    bg: 'bg-red-50',    badge: 'bg-red-100 text-red-800',       total: 0, count: 0 },
    { label: '90+ days',   min: 91, max: 9999,  border: 'border-rose-200',   bg: 'bg-rose-50',   badge: 'bg-rose-100 text-rose-900',     total: 0, count: 0 },
  ]

  for (const row of rows) {
    const b = buckets.find(b => row.daysPast >= b.min && row.daysPast <= b.max)
    if (b) { b.total += row.amount; b.count++ }
  }

  const grandTotal = rows.reduce((s, r) => s + r.amount, 0)

  function bucketFor(days: number) {
    return buckets.find(b => days >= b.min && days <= b.max)
  }

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payment Aging Report</h2>
          <p className="text-slate-500 text-sm mt-0.5">Overdue invoices bucketed by days past due — prioritize collection</p>
        </div>
        <div className="flex items-center gap-2">
          <PropertySelectClient properties={properties} selectedId={propertyId} />
          <PaymentAgingExcelButton rows={rows} grandTotal={grandTotal} currency={currency} />
          <PrintButton />
        </div>
      </div>
      <PrintHeader reportTitle="Payment Aging Report" orgName={orgName} userName={userName} printDate={printDate} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {buckets.map(b => (
          <div key={b.label} className={`card p-4 border ${b.border} ${b.bg}`}>
            <div className="text-2xl font-bold text-slate-800">{b.count}</div>
            <div className="text-xs font-semibold text-slate-600 mt-0.5">{b.label}</div>
            <div className="text-sm font-semibold text-red-700 mt-1"><OmrAmount value={b.total} /></div>
          </div>
        ))}
      </div>

      <div className="card p-4 flex items-center gap-3 border border-red-200 bg-red-50">
        <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
        <div>
          <span className="font-semibold text-red-800">Total Outstanding: <OmrAmount value={grandTotal} /></span>
          <span className="text-red-600 text-sm ml-2">across {rows.length} overdue invoice{rows.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <CreditCard size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Invoice Detail</h3>
        </div>
        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-emerald-600 text-sm">✓ No overdue invoices.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Tenant</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Unit</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Property</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Due Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Days Overdue</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => {
                  const b = bucketFor(r.daysPast)
                  return (
                    <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="px-4 py-3 font-medium text-slate-800">{r.tenants?.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{(r.units as any)?.unit_number ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{(r.units as any)?.properties?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(r.due_date).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${b?.badge ?? 'bg-slate-100 text-slate-600'}`}>
                          {r.daysPast}d
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-red-600"><OmrAmount value={r.amount} /></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={5} className="px-4 py-3 text-slate-700">Grand Total</td>
                  <td className="px-4 py-3 text-red-700"><OmrAmount value={grandTotal} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
