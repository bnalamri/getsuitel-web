import { createClient, createAdminClient } from '@/lib/supabase/server'
import { CreditCard, AlertTriangle, Layers, Landmark } from 'lucide-react'
import PrintButton from '@/components/PrintButton'
import PrintHeader from '@/components/PrintHeader'
import PropertySelectClient from '@/components/PropertySelectClient'
import OmrAmount from '@/components/OmrAmount'
import ChequesInHandExcelButton from './ExcelExportButton'

export const metadata = { title: 'Cheques in Hand' }
export const dynamic = 'force-dynamic'

// "In hand" = status 'pending' (registered post-dated cheque, not yet deposited).
// Counted per tenant + unit — the same grouping the rent cron's last-cheque
// alert uses, so this report and that alert always agree on "remaining".
// LOW_THRESHOLD: flag a contract as running low when this many (or fewer)
// cheques remain in hand. The cron alert itself still fires at exactly 1.
const LOW_THRESHOLD = 2

type ChequeRow = {
  id: string; tenant_id: string; unit_id: string | null; status: string
  due_date: string; amount: number; cheque_number: string | null
}
type ContractRow = {
  id: string; tenant_id: string; unit_id: string; end_date: string | null
  tenants: { full_name: string } | null
  units: { unit_number: string; property_id: string; properties: { name: string } | null } | null
}

export interface InHandRow {
  contractId: string
  tenant: string
  unit: string
  property: string
  inHand: number
  inHandAmount: number
  nextDue: string | null
  lastDue: string | null
  firstNo: string | null
  lastNo: string | null
  deposited: number
  contractEnd: string | null
  level: 'none' | 'last' | 'low' | 'ok'
}

export default async function ChequesInHandPage({ searchParams }: { searchParams: Promise<{ property_id?: string }> }) {
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

  const [contractsRes, chequesRes, orgRes, propertiesRes] = await Promise.all([
    admin.from('contracts')
      .select('id, tenant_id, unit_id, end_date, tenants(full_name), units(unit_number, property_id, properties(name))')
      .eq('organization_id', orgId).eq('status', 'active').eq('payment_method', 'cheque'),
    admin.from('cheques')
      .select('id, tenant_id, unit_id, status, due_date, amount, cheque_number')
      .eq('organization_id', orgId).in('status', ['pending', 'deposited']),
    admin.from('organizations').select('name, default_currency').eq('id', orgId).single(),
    admin.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
  ])

  const currency = (orgRes.data?.default_currency as string) ?? 'OMR'
  const orgName = (orgRes.data?.name as string) ?? ''
  const properties = (propertiesRes.data ?? []) as { id: string; name: string }[]
  const contracts = (contractsRes.data ?? []) as unknown as ContractRow[]
  const cheques = (chequesRes.data ?? []) as ChequeRow[]

  const rows: InHandRow[] = contracts
    .filter(c => !propertyId || c.units?.property_id === propertyId)
    .map(c => {
      const mine = cheques.filter(q => q.tenant_id === c.tenant_id && q.unit_id === c.unit_id)
      const pending = mine.filter(q => q.status === 'pending').sort((a, b) => a.due_date.localeCompare(b.due_date))
      const inHand = pending.length
      return {
        contractId: c.id,
        tenant: c.tenants?.full_name ?? 'Unknown',
        unit: c.units?.unit_number ?? '—',
        property: c.units?.properties?.name ?? '—',
        inHand,
        inHandAmount: pending.reduce((s, q) => s + Number(q.amount ?? 0), 0),
        nextDue: pending[0]?.due_date ?? null,
        lastDue: pending[inHand - 1]?.due_date ?? null,
        firstNo: pending[0]?.cheque_number ?? null,
        lastNo: pending[inHand - 1]?.cheque_number ?? null,
        deposited: mine.filter(q => q.status === 'deposited').length,
        contractEnd: c.end_date,
        level: inHand === 0 ? 'none' : inHand === 1 ? 'last' : inHand <= LOW_THRESHOLD ? 'low' : 'ok',
      } as InHandRow
    })
    // Most urgent first: none, then fewest remaining
    .sort((a, b) => a.inHand - b.inHand || a.property.localeCompare(b.property) || a.unit.localeCompare(b.unit))

  const totalInHand = rows.reduce((s, r) => s + r.inHand, 0)
  const totalAmount = rows.reduce((s, r) => s + r.inHandAmount, 0)
  const noneCount = rows.filter(r => r.level === 'none').length
  const lowCount = rows.filter(r => r.level === 'last' || r.level === 'low').length
  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : '—')

  function badge(level: InHandRow['level']) {
    if (level === 'none') return <span className="inline-flex px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">None in hand</span>
    if (level === 'last') return <span className="inline-flex px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Last cheque</span>
    if (level === 'low')  return <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">Running low</span>
    return <span className="inline-flex px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">OK</span>
  }

  return (
    <div className="space-y-6 p-6">
      <style>{`@media print { aside,header{display:none!important} .no-print{display:none!important} }`}</style>

      <div className="flex items-start justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cheques in Hand</h2>
          <p className="text-slate-500 text-sm mt-0.5">Post-dated cheques held per active cheque contract, and how many remain</p>
        </div>
        <div className="flex items-center gap-2">
          <PropertySelectClient properties={properties} selectedId={propertyId} />
          <ChequesInHandExcelButton rows={rows} currency={currency} totalInHand={totalInHand} totalAmount={totalAmount} />
          <PrintButton />
        </div>
      </div>
      <PrintHeader reportTitle="Cheques in Hand" orgName={orgName} userName={userName} printDate={printDate} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <CreditCard size={20} className="text-slate-700" />
          <div>
            <div className="text-xl font-bold text-slate-700">{totalInHand}</div>
            <div className="text-xs text-slate-500">Cheques in Hand</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Landmark size={20} className="text-emerald-700" />
          <div>
            <div className="text-xl font-bold text-emerald-700"><OmrAmount value={totalAmount} /></div>
            <div className="text-xs text-slate-500">Value in Hand</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-600" />
          <div>
            <div className="text-xl font-bold text-amber-600">{lowCount}</div>
            <div className="text-xs text-slate-500">Running Low (≤ {LOW_THRESHOLD})</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Layers size={20} className="text-red-600" />
          <div>
            <div className="text-xl font-bold text-red-600">{noneCount}</div>
            <div className="text-xs text-slate-500">None in Hand</div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <CreditCard size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">By Contract</h3>
        </div>
        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">No active cheque-payment contracts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Tenant</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Property / Unit</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">In Hand</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Value</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Next Due</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Last Cheque Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Cheque #s</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Deposited</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Contract Ends</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={r.contractId} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.tenant}</td>
                    <td className="px-4 py-3 text-slate-600">{r.property} — {r.unit}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{r.inHand}</td>
                    <td className="px-4 py-3 text-slate-600">{r.inHandAmount > 0 ? <OmrAmount value={r.inHandAmount} /> : '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(r.nextDue)}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(r.lastDue)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {r.firstNo ? (r.firstNo === r.lastNo ? r.firstNo : `${r.firstNo} → ${r.lastNo}`) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.deposited || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(r.contractEnd)}</td>
                    <td className="px-4 py-3">{badge(r.level)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={2} className="px-4 py-3 text-slate-700">Total</td>
                  <td className="px-4 py-3 text-slate-800">{totalInHand}</td>
                  <td className="px-4 py-3 text-slate-800"><OmrAmount value={totalAmount} /></td>
                  <td colSpan={6} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400">
        &quot;In hand&quot; counts cheques with status Pending (registered, not yet deposited). &quot;Deposited&quot; are cheques banked but not yet cleared.
      </p>
    </div>
  )
}
