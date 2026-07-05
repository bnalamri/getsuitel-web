'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Minus, ChevronDown, ChevronUp } from 'lucide-react'

interface Tenant   { id: string; full_name: string }
interface Unit     { id: string; unit_number: string; properties: { name: string } | null }
interface Contract { id: string; tenant_id: string; unit_id: string }

interface ChequeRow {
  cheque_number: string
  bank_name: string
  amount: string
  due_date: string
}

const emptyRow = (): ChequeRow => ({ cheque_number: '', bank_name: '', amount: '', due_date: '' })

export default function AddChequeForm({
  orgId, tenants, units, contracts,
}: {
  orgId: string
  tenants: Tenant[]
  units: Unit[]
  contracts: Contract[]
}) {
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [tenantId, setTenantId] = useState('')
  const [unitId, setUnitId]     = useState('')
  const [rows, setRows]         = useState<ChequeRow[]>([emptyRow()])
  const router = useRouter()

  // Auto-fill unit when tenant selected via active contract
  function onTenantChange(id: string) {
    setTenantId(id)
    const contract = contracts.find(c => c.tenant_id === id)
    if (contract) setUnitId(contract.unit_id)
  }

  function updateRow(i: number, key: keyof ChequeRow, value: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: value } : r))
  }

  function addRow() { setRows(prev => [...prev, emptyRow()]) }
  function removeRow(i: number) { setRows(prev => prev.filter((_, idx) => idx !== i)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) return
    setLoading(true)
    const total = rows.length
    const payload = rows.map((r, i) => ({
      organization_id: orgId,
      tenant_id: tenantId,
      unit_id: unitId || undefined,
      cheque_number: r.cheque_number,
      bank_name: r.bank_name,
      amount: parseFloat(r.amount),
      due_date: r.due_date,
      sequence_number: total > 1 ? i + 1 : undefined,
      total_cheques: total > 1 ? total : undefined,
    }))

    await fetch('/api/payments/cheques', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cheques: payload }),
    })
    setLoading(false)
    setRows([emptyRow()])
    setTenantId('')
    setUnitId('')
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Plus size={16} className="text-navy-700"/> Register Cheque(s)
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tenant *</label>
              <select className="input" required value={tenantId} onChange={e => onTenantChange(e.target.value)}>
                <option value="">Select tenant</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" value={unitId} onChange={e => setUnitId(e.target.value)}>
                <option value="">Select unit</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.unit_number}{u.properties ? ` · ${u.properties.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cheque rows */}
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
                <div>
                  {i === 0 && <label className="label">Cheque #</label>}
                  <input className="input" required placeholder="123456" value={row.cheque_number}
                    onChange={e => updateRow(i, 'cheque_number', e.target.value)} />
                </div>
                <div>
                  {i === 0 && <label className="label">Bank</label>}
                  <input className="input" required placeholder="BankMuscat" value={row.bank_name}
                    onChange={e => updateRow(i, 'bank_name', e.target.value)} />
                </div>
                <div>
                  {i === 0 && <label className="label">Amount (OMR)</label>}
                  <input className="input" required type="number" step="0.001" placeholder="250.000" value={row.amount}
                    onChange={e => updateRow(i, 'amount', e.target.value)} />
                </div>
                <div>
                  {i === 0 && <label className="label">Due Date</label>}
                  <input className="input" required type="date" value={row.due_date}
                    onChange={e => updateRow(i, 'due_date', e.target.value)} />
                </div>
                <div className={i === 0 ? 'pt-5' : ''}>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)}
                      className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50">
                      <Minus size={14}/>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 border border-dashed border-slate-300 hover:border-slate-500 px-3 py-1.5 rounded-lg">
              <Plus size={13}/> Add row
            </button>
            <span className="text-xs text-slate-400">{rows.length > 1 ? `${rows.length} cheques will be registered` : ''}</span>
            <div className="flex-1"/>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
              {loading ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
              Register {rows.length > 1 ? `${rows.length} Cheques` : 'Cheque'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
