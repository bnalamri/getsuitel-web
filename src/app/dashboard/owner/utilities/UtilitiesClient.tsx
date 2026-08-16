'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Zap, Wifi, AlertCircle, CheckCircle2, Clock, Receipt, TrendingDown } from 'lucide-react'
import OmrAmount from '@/components/OmrAmount'

type UtilBill = {
  id: string
  utility_type: 'water' | 'electricity' | 'internet'
  bill_date: string
  due_date: string
  amount: number
  currency: string
  billed_to: 'tenant' | 'owner'
  status: string
  meter_from?: number | null
  meter_to?: number | null
  notes?: string | null
  units: { unit_number: string; properties: { name: string } | null } | null
  tenants: { full_name: string } | null
}

type Contract = {
  id: string
  tenant_id: string
  status: string
  utilities_config: { water?: string; electricity?: string; internet?: string } | null
  tenants: { id: string; full_name: string } | null
}

type Unit = {
  id: string
  unit_number: string
  properties: { id: string; name: string } | null
  contracts: Contract[]
}

const UTIL_LABELS: Record<string, string> = {
  water:       'Water',
  electricity: 'Electricity',
  internet:    'Internet',
}

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  pending:          { label: 'Pending',          cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  invoiced:         { label: 'Invoiced',          cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid:             { label: 'Paid',              cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expense_recorded: { label: 'Expense Recorded',  cls: 'bg-slate-50 text-slate-600 border-slate-200' },
}

export default function UtilitiesClient({
  bills: initialBills,
  units,
  orgId,
  defaultCurrency,
}: {
  bills: UtilBill[]
  units: Unit[]
  orgId: string
  defaultCurrency: string
}) {
  const router = useRouter()
  const [bills, setBills] = useState(initialBills)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Derive unique properties from units list
  const properties = Array.from(
    new Map(units.map(u => [u.properties?.id, u.properties]).filter(([id]) => id)).values()
  ) as { id: string; name: string }[]
  const firstPropId = properties[0]?.id ?? ''

  // Form state
  const [propertyId, setPropertyId] = useState(firstPropId)
  const filteredUnits = units.filter(u => u.properties?.id === propertyId)
  const [unitId, setUnitId] = useState(filteredUnits[0]?.id ?? units[0]?.id ?? '')
  const [utilType, setUtilType] = useState<'water' | 'electricity' | 'internet'>('water')
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(defaultCurrency)
  const [billedTo, setBilledTo] = useState<'tenant' | 'owner'>('owner')
  const [meterFrom, setMeterFrom] = useState('')
  const [meterTo, setMeterTo] = useState('')
  const [notes, setNotes] = useState('')

  // Derive active contract for selected unit
  const selectedUnit = units.find(u => u.id === unitId)
  const activeContract = selectedUnit?.contracts?.find(c => c.status === 'active') ?? null

  // Auto-set billedTo from contract utilities_config when unit or utilType changes
  useEffect(() => {
    if (!activeContract) return
    const cfg = activeContract.utilities_config
    if (!cfg) return
    const who = utilType === 'water' ? cfg.water : utilType === 'electricity' ? cfg.electricity : cfg.internet
    if (who === 'tenant' || who === 'owner') setBilledTo(who)
  }, [unitId, utilType, activeContract])

  const tenantId = activeContract?.tenants?.id ?? null

  // Summary stats
  const totalBilled = bills.reduce((s, b) => s + b.amount, 0)
  const toTenant    = bills.filter(b => b.billed_to === 'tenant').reduce((s, b) => s + b.amount, 0)
  const toOwner     = bills.filter(b => b.billed_to === 'owner').reduce((s, b) => s + b.amount, 0)

  function resetForm() {
    const pid = firstPropId
    setPropertyId(pid)
    const firstUnit = units.find(u => u.properties?.id === pid)
    setUnitId(firstUnit?.id ?? units[0]?.id ?? '')
    setUtilType('water')
    setBillDate(new Date().toISOString().split('T')[0])
    setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0])
    setAmount('')
    setCurrency(defaultCurrency)
    setBilledTo('owner')
    setMeterFrom('')
    setMeterTo('')
    setNotes('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount'); return }
    if (billedTo === 'tenant' && !tenantId) { setError('No active tenant found for this unit'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/utilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_id:      unitId,
        contract_id:  activeContract?.id ?? null,
        tenant_id:    billedTo === 'tenant' ? tenantId : null,
        utility_type: utilType,
        bill_date:    billDate,
        due_date:     dueDate,
        amount:       Number(amount),
        currency,
        billed_to:    billedTo,
        meter_from:   meterFrom ? Number(meterFrom) : null,
        meter_to:     meterTo   ? Number(meterTo)   : null,
        notes:        notes || null,
      }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) { setError(json.error ?? 'Failed to save'); return }

    const actionMsg = json.action === 'invoiced'
      ? '✓ Bill saved — tenant invoice created'
      : json.action === 'expense_recorded'
      ? '✓ Bill saved — recorded as owner expense'
      : '✓ Bill saved'

    setSuccess(actionMsg)
    setShowForm(false)
    resetForm()
    router.refresh()
    setTimeout(() => setSuccess(''), 4000)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Utility Bills</h1>
          <p className="text-slate-500 text-sm mt-0.5">Record Water &amp; Electricity and Internet bills — auto-routed to tenant invoice or owner expense</p>
        </div>
        <button onClick={() => { setShowForm(true); setError('') }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Bill
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1">Total Billed</div>
          <div className="text-xl font-bold text-slate-800"><OmrAmount value={totalBilled} /></div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Receipt size={11}/> To Tenant</div>
          <div className="text-xl font-bold text-blue-700"><OmrAmount value={toTenant} /></div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><TrendingDown size={11}/> To Owner</div>
          <div className="text-xl font-bold text-orange-600"><OmrAmount value={toOwner} /></div>
        </div>
      </div>

      {/* Bills table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Unit</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Utility</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Bill Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Due Date</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Billed To</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bills.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">No utility bills yet. Click &ldquo;New Bill&rdquo; to add one.</td>
                </tr>
              )}
              {bills.map(b => {
                const chip = STATUS_CHIP[b.status] ?? { label: b.status, cls: 'bg-slate-50 text-slate-500 border-slate-200' }
                const isElec = b.utility_type === 'electricity'
                const isWifi = b.utility_type === 'internet'
                return (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{b.units?.properties?.name ?? '—'}</div>
                      <div className="text-xs text-slate-400">Unit {b.units?.unit_number}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${isWifi ? 'bg-violet-50 text-violet-700 border-violet-200' : isElec ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {isWifi ? <Wifi size={11}/> : <Zap size={11}/>}
                        {UTIL_LABELS[b.utility_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.bill_date}</td>
                    <td className="px-4 py-3 text-slate-600">{b.due_date}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <OmrAmount value={b.amount} />
                    </td>
                    <td className="px-4 py-3">
                      {b.billed_to === 'tenant' ? (
                        <div>
                          <div className="text-xs font-medium text-blue-700">Tenant</div>
                          {b.tenants?.full_name && <div className="text-xs text-slate-400">{b.tenants.full_name}</div>}
                        </div>
                      ) : (
                        <div className="text-xs font-medium text-orange-600">Owner</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${chip.cls}`}>{chip.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Bill Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-900">New Utility Bill</h2>
              <button onClick={() => { setShowForm(false); resetForm() }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">

              {/* Property → Unit cascade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Property</label>
                  <select className="input" value={propertyId} onChange={e => {
                    const pid = e.target.value
                    setPropertyId(pid)
                    const first = units.find(u => u.properties?.id === pid)
                    if (first) setUnitId(first.id)
                  }}>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select className="input" value={unitId} onChange={e => setUnitId(e.target.value)} required>
                    {filteredUnits.map(u => (
                      <option key={u.id} value={u.id}>Unit {u.unit_number}</option>
                    ))}
                  </select>
                </div>
              </div>
              {activeContract && (
                <p className="text-xs text-slate-400 -mt-2">
                  Tenant: {activeContract.tenants?.full_name ?? '—'}
                </p>
              )}
              {!activeContract && unitId && (
                <p className="text-xs text-amber-600 -mt-2 flex items-center gap-1"><AlertCircle size={11}/> No active contract on this unit</p>
              )}

              {/* Utility type */}
              <div>
                <label className="label">Utility Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['water', 'electricity', 'internet'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setUtilType(t)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors
                        ${utilType === t ? 'border-navy-400 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      {t === 'internet' ? <Wifi size={14}/> : <Zap size={14}/>}
                      {UTIL_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Bill Date</label>
                  <input className="input" type="date" value={billDate} onChange={e => setBillDate(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                </div>
              </div>

              {/* Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount</label>
                  <input className="input" type="number" step="0.001" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.000" required />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option>OMR</option><option>SAR</option><option>AED</option><option>KWD</option>
                    <option>QAR</option><option>BHD</option><option>USD</option>
                  </select>
                </div>
              </div>

              {/* Meter readings (water/electricity only) */}
              {(utilType === 'water' || utilType === 'electricity') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Meter From <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input className="input" type="number" step="0.01" value={meterFrom} onChange={e => setMeterFrom(e.target.value)} placeholder="e.g. 1230.5" />
                  </div>
                  <div>
                    <label className="label">Meter To <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input className="input" type="number" step="0.01" value={meterTo} onChange={e => setMeterTo(e.target.value)} placeholder="e.g. 1460.0" />
                  </div>
                </div>
              )}

              {/* Billed to */}
              <div>
                <label className="label">Billed To</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['tenant', 'owner'] as const).map(who => (
                    <button
                      key={who}
                      type="button"
                      onClick={() => setBilledTo(who)}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors
                        ${billedTo === who ? 'border-navy-400 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      {who === 'tenant' ? <Receipt size={14}/> : <TrendingDown size={14}/>}
                      {who.charAt(0).toUpperCase() + who.slice(1)}
                    </button>
                  ))}
                </div>
                {billedTo === 'tenant' && activeContract && (
                  <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 size={11}/> Will generate an invoice for {activeContract.tenants?.full_name ?? 'tenant'}
                  </p>
                )}
                {billedTo === 'owner' && (
                  <p className="text-xs text-orange-600 mt-1.5 flex items-center gap-1">
                    <TrendingDown size={11}/> Will record as owner expense
                  </p>
                )}
                {billedTo === 'tenant' && !activeContract && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1"><AlertCircle size={11}/> No active contract — cannot invoice tenant</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea className="input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. June billing period" />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertCircle size={14}/> {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
