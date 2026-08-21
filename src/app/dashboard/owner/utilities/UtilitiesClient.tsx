'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Zap, Wifi, AlertCircle, CheckCircle2, Clock, Receipt, TrendingDown, Paperclip } from 'lucide-react'
import OmrAmount from '@/components/OmrAmount'
import DateInput from '@/components/DateInput'

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
  attachment_url?: string | null
  utility_scope?: string | null
  consumer_no?: string | null
  meter_number?: string | null
  service_type?: string | null
  recharge_code?: string | null
  tariff_type?: string | null
  property_id?: string | null
  units: { unit_number: string; properties: { name: string } | null } | null
  tenants: { full_name: string } | null
  properties?: { name: string } | null
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
  properties,
  orgId,
  defaultCurrency,
}: {
  bills: UtilBill[]
  units: Unit[]
  properties: { id: string; name: string }[]
  orgId: string
  defaultCurrency: string
}) {
  const router = useRouter()
  const [bills, setBills] = useState(initialBills)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const attachFileRef = useRef<HTMLInputElement>(null)

  const firstPropId = properties[0]?.id ?? ''

  // Form state
  const [propertyId, setPropertyId] = useState(firstPropId)
  const filteredUnits = units
    .filter(u => !propertyId || u.properties?.id === propertyId)
    .sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }))
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
  // New fields (Fix #5 + #6)
  const [utilScope, setUtilScope]       = useState<'unit' | 'general'>('unit')
  const [consumerNo, setConsumerNo]     = useState('')
  const [meterNumber, setMeterNumber]   = useState('')
  const [serviceType, setServiceType]   = useState('postpaid')
  const [rechargeCode, setRechargeCode] = useState('')
  const [tariffType, setTariffType]     = useState('')

  // Utility account auto-fill (read-only — manage accounts in Utility Accounts page)
  const [accountAutoFilled, setAccountAutoFilled] = useState(false)

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

  // Auto-fill Consumer No., Meter Number etc. from utility_accounts when selection changes
  useEffect(() => {
    setAccountAutoFilled(false)
    const params = new URLSearchParams({ utility_type: utilType })
    if (utilScope === 'general' && propertyId) {
      params.set('property_id', propertyId)
      params.set('general', 'true')
    } else if (utilScope === 'unit' && unitId) {
      params.set('unit_id', unitId)
    } else {
      return
    }
    fetch(`/api/utility-accounts?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (!data || !data.id) return
        setConsumerNo(data.consumer_no   ?? '')
        setMeterNumber(data.meter_number  ?? '')
        setRechargeCode(data.recharge_code ?? '')
        setTariffType(data.tariff_type   ?? '')
        if (data.service_type) setServiceType(data.service_type)
        setAccountAutoFilled(true)
      })
      .catch(() => {})
  }, [unitId, propertyId, utilType, utilScope])

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
    setUtilScope('unit')
    setConsumerNo('')
    setMeterNumber('')
    setServiceType('postpaid')
    setRechargeCode('')
    setTariffType('')
    setAccountAutoFilled(false)
    setAttachmentFile(null)
    if (attachFileRef.current) attachFileRef.current.value = ''
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount'); return }
    if (billedTo === 'tenant' && !tenantId) { setError('No active tenant found for this unit'); return }
    setLoading(true)
    setError('')

    const effectiveBilledTo = utilScope === 'general' ? 'owner' : billedTo
    const res = await fetch('/api/utilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        utility_scope: utilScope,
        property_id:  utilScope === 'general' ? propertyId : null,
        unit_id:      utilScope === 'general' ? null : unitId,
        contract_id:  utilScope === 'general' ? null : (activeContract?.id ?? null),
        tenant_id:    effectiveBilledTo === 'tenant' ? tenantId : null,
        utility_type: utilType,
        bill_date:    billDate,
        due_date:     dueDate,
        amount:       Number(amount),
        currency,
        billed_to:    effectiveBilledTo,
        meter_from:   meterFrom ? Number(meterFrom) : null,
        meter_to:     meterTo   ? Number(meterTo)   : null,
        notes:        notes || null,
        consumer_no:  consumerNo || null,
        meter_number: meterNumber || null,
        service_type: serviceType || null,
        recharge_code: (serviceType === 'prepaid' && rechargeCode) ? rechargeCode : null,
        tariff_type:  (utilType !== 'internet' && tariffType) ? tariffType : null,
      }),
    })

    const json = await res.json()

    if (!res.ok) { setLoading(false); setError(json.error ?? 'Failed to save'); return }

    // Upload attachment if provided
    if (attachmentFile && json.id) {
      const fd = new FormData()
      fd.append('billId', json.id)
      fd.append('file', attachmentFile)
      await fetch('/api/utility-bills/upload', { method: 'POST', body: fd })
    }

    setLoading(false)

    const actionMsg = json.action === 'invoiced'
      ? '✓ Bill saved — tenant invoice created'
      : '✓ Bill saved — click "Mark Paid" when you settle it'

    setSuccess(actionMsg)
    setShowForm(false)
    resetForm()
    router.refresh()
    setTimeout(() => setSuccess(''), 4000)
  }

  async function markPaid(billId: string) {
    const res = await fetch('/api/utilities', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: billId, action: 'mark_paid' }),
    })
    if (res.ok) {
      setSuccess('✓ Bill marked as paid — expense recorded')
      router.refresh()
      setTimeout(() => setSuccess(''), 4000)
    }
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
                <th className="px-4 py-3"></th>
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
                      {b.utility_scope === 'general' ? (
                        <>
                          <div className="font-medium text-slate-800">{b.properties?.name ?? b.units?.properties?.name ?? '—'}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-md">General</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-medium text-slate-800">{b.units?.properties?.name ?? '—'}</div>
                          <div className="text-xs text-slate-400">Unit {b.units?.unit_number}</div>
                        </>
                      )}
                      {(b.consumer_no || b.meter_number) && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {b.consumer_no && <span>C# {b.consumer_no}</span>}
                          {b.consumer_no && b.meter_number && ' · '}
                          {b.meter_number && <span>{b.utility_type === 'internet' ? 'Ph#' : 'M#'} {b.meter_number}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${isWifi ? 'bg-violet-50 text-violet-700 border-violet-200' : isElec ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {isWifi ? <Wifi size={11}/> : <Zap size={11}/>}
                        {UTIL_LABELS[b.utility_type]}
                      </span>
                      {b.service_type && b.service_type !== 'postpaid' && (
                        <div className="text-xs text-slate-400 mt-0.5 capitalize">{b.service_type}</div>
                      )}
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {b.attachment_url && (
                          <a href={b.attachment_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                            <Paperclip size={12} />
                            View Attachment
                          </a>
                        )}
                        {b.status === 'pending' && (
                          <button
                            onClick={() => markPaid(b.id)}
                            className="text-xs text-emerald-700 hover:text-emerald-900 border border-emerald-200 hover:border-emerald-400 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
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

              {/* Billing Scope toggle (Fix #6) */}
              <div>
                <label className="label">Billing Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['unit', 'general'] as const).map(s => (
                    <button key={s} type="button"
                      onClick={() => { setUtilScope(s); if (s === 'general') setBilledTo('owner') }}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors
                        ${utilScope === s ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {s === 'unit' ? 'Unit-Related' : 'General (Property)'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {utilScope === 'general' ? 'Property-level bill — always billed to Owner' : 'Per-unit bill — billed per contract config'}
                </p>
              </div>

              {/* Property selector */}
              <div>
                <label className="label">Property</label>
                <select className="input" value={propertyId} onChange={e => {
                  const pid = e.target.value
                  setPropertyId(pid)
                  if (utilScope === 'unit') {
                    const first = units.find(u => u.properties?.id === pid)
                    if (first) setUnitId(first.id)
                  }
                }}>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Unit selector — only for unit-related scope */}
              {utilScope === 'unit' && (
                <div>
                  <label className="label">Unit</label>
                  <select className="input" value={unitId} onChange={e => setUnitId(e.target.value)} required>
                    {filteredUnits.map(u => (
                      <option key={u.id} value={u.id}>Unit {u.unit_number}</option>
                    ))}
                  </select>
                  {activeContract && (
                    <p className="text-xs text-slate-400 mt-1">Tenant: {activeContract.tenants?.full_name ?? '—'}</p>
                  )}
                  {!activeContract && unitId && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><AlertCircle size={11}/> No active contract on this unit</p>
                  )}
                </div>
              )}

              {/* Utility type */}
              <div>
                <label className="label">
                  Utility Type
                  {utilScope === 'general' && (
                    <span className="ml-2 text-slate-400 font-normal text-xs">— selects the matching general account</span>
                  )}
                </label>
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
                  <DateInput value={billDate} onChange={setBillDate} required />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <DateInput value={dueDate} onChange={setDueDate} required />
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

              {/* Billed to — hidden for general scope */}
              {utilScope === 'unit' ? (
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
              ) : (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-amber-800">
                  <TrendingDown size={14} className="text-amber-600 flex-shrink-0" />
                  General bills are always billed to Owner
                </div>
              )}

              {/* Account Details — read-only, auto-filled from Utility Accounts */}
              {accountAutoFilled ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800">Account Details</span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-white border border-emerald-200 rounded-full px-2 py-0.5">
                      ✦ Auto-filled
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                    {consumerNo   && <div><span className="text-slate-400">Consumer No. </span>{consumerNo}</div>}
                    {meterNumber  && <div><span className="text-slate-400">{utilType === 'internet' ? 'Telephone No. ' : 'Meter No. '}</span>{meterNumber}</div>}
                    {serviceType  && <div><span className="text-slate-400">Service </span>{serviceType.charAt(0).toUpperCase()+serviceType.slice(1)}</div>}
                    {tariffType   && <div><span className="text-slate-400">Tariff </span>{tariffType}</div>}
                    {rechargeCode && <div><span className="text-slate-400">Recharge </span>{rechargeCode}</div>}
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">To edit these details, go to <strong>Utility Accounts</strong>.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">No saved account found for this {utilScope === 'unit' ? 'unit' : 'property'} / utility type. Add one in <strong>Utility Accounts</strong>.</p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="label">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea className="input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. June billing period" />
              </div>

              {/* Attachment */}
              <div>
                <label className="label">Attachment <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  ref={attachFileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="sr-only"
                  onChange={e => setAttachmentFile(e.target.files?.[0] ?? null)}
                />
                {attachmentFile ? (
                  <div className="flex items-center gap-2 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                    <span className="text-emerald-800 truncate flex-1">{attachmentFile.name}</span>
                    <button type="button" onClick={() => { setAttachmentFile(null); if (attachFileRef.current) attachFileRef.current.value = '' }}
                      className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => attachFileRef.current?.click()}
                    className="flex items-center gap-2 text-sm text-navy-700 hover:text-navy-900 border border-dashed border-slate-300 hover:border-navy-400 rounded-lg px-4 py-2.5 w-full transition-colors"
                  >
                    <Paperclip size={14} /> Attach Bill Document (PDF / Image)
                  </button>
                )}
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
