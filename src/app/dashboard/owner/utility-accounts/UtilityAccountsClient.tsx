'use client'
import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, FileSpreadsheet, Printer, X, Save } from 'lucide-react'
import * as XLSX from 'xlsx'

type Account = {
  id: string
  property_id: string
  unit_id: string | null
  utility_type: string
  consumer_no: string | null
  meter_number: string | null
  recharge_code: string | null
  tariff_type: string | null
  service_type: string | null
  notes: string | null
  tank_number: string | null
  units?: { unit_number: string } | null
  properties?: { name: string } | null
}

type Property = { id: string; name: string }
type Unit = { id: string; unit_number: string; property_id: string; properties?: { id: string; name: string } | null }

const UTILITY_TYPES = ['electricity', 'internet', 'water']
const SERVICE_TYPES = ['postpaid', 'prepaid', 'fiber']

const typeLabel = (t: string) =>
  t === 'water' ? 'Water' : t === 'electricity' ? 'Electricity' : 'Internet'

const typeColor = (t: string) =>
  t === 'water' ? 'bg-blue-100 text-blue-700' :
  t === 'electricity' ? 'bg-yellow-100 text-yellow-700' :
  'bg-purple-100 text-purple-700'

const svcLabel = (s: string | null) =>
  s === 'prepaid' ? 'Prepaid' : s === 'fiber' ? 'Fiber' : 'Postpaid'

function emptyForm() {
  return {
    id: '', property_id: '', unit_id: '', utility_type: 'electricity',
    consumer_no: '', meter_number: '', recharge_code: '',
    tariff_type: '', service_type: 'postpaid', notes: '', tank_number: '',
  }
}

export default function UtilityAccountsClient({
  accounts: initial,
  properties,
  units,
  orgName,
  userName,
}: {
  accounts: Account[]
  properties: Property[]
  units: Unit[]
  orgName: string
  userName: string
}) {
  const [accounts, setAccounts]         = useState<Account[]>(initial)
  const [filterProp, setFilterProp]     = useState('')
  const [filterType, setFilterType]     = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [form, setForm]                 = useState(emptyForm())
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')

  // Units filtered to selected property in form, sorted numerically
  const formUnits = units
    .filter(u => u.property_id === form.property_id)
    .sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }))

  // Display list after filters, sorted by property name then unit number
  const visible = accounts
    .filter(a => {
      if (filterProp && a.property_id !== filterProp) return false
      if (filterType && a.utility_type !== filterType) return false
      return true
    })
    .sort((a, b) => {
      const pA = (a.properties as { name: string } | null)?.name ?? ''
      const pB = (b.properties as { name: string } | null)?.name ?? ''
      const pc = pA.localeCompare(pB)
      if (pc !== 0) return pc
      const uA = (a.units as { unit_number: string } | null)?.unit_number ?? ''
      const uB = (b.units as { unit_number: string } | null)?.unit_number ?? ''
      return uA.localeCompare(uB, undefined, { numeric: true })
    })

  function openAdd() {
    setForm(emptyForm())
    setError('')
    setShowModal(true)
  }

  function openEdit(a: Account) {
    setForm({
      id: a.id,
      property_id: a.property_id,
      unit_id: a.unit_id ?? '',
      utility_type: a.utility_type,
      consumer_no: a.consumer_no ?? '',
      meter_number: a.meter_number ?? '',
      recharge_code: a.recharge_code ?? '',
      tariff_type: a.tariff_type ?? '',
      service_type: a.service_type ?? 'postpaid',
      notes: a.notes ?? '',
      tank_number: a.tank_number ?? '',
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.property_id || !form.utility_type) {
      setError('Property and utility type are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/utility-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:            form.id || undefined,
          property_id:   form.property_id,
          unit_id:       form.unit_id || null,
          utility_type:  form.utility_type,
          consumer_no:   form.consumer_no  || null,
          meter_number:  form.meter_number || null,
          recharge_code: form.recharge_code || null,
          tariff_type:   form.tariff_type  || null,
          service_type:  form.service_type || 'postpaid',
          notes:         form.notes        || null,
          tank_number:   form.tank_number  || null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Save failed'); }
      // Refresh list
      const listRes = await fetch('/api/utility-accounts/list')
      const data = await listRes.json()
      setAccounts(data)
      setShowModal(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this utility account?')) return
    try {
      await fetch(`/api/utility-accounts?id=${id}`, { method: 'DELETE' })
      setAccounts(prev => prev.filter(a => a.id !== id))
    } catch { /* non-fatal */ }
  }

  // ── Excel export ──────────────────────────────────────────────────────────
  function exportExcel() {
    const rows = visible.map(a => ({
      'Property':     (a.properties as { name: string } | null)?.name ?? '',
      'Unit':         a.unit_id ? ((a.units as { unit_number: string } | null)?.unit_number ?? '') : 'General',
      'Utility':      typeLabel(a.utility_type),
      'Service Type': svcLabel(a.service_type),
      'Consumer No.': a.consumer_no ?? '',
      'Meter No.':    a.meter_number ?? '',
      'Recharge Code':a.recharge_code ?? '',
      'Tariff Type':  a.tariff_type ?? '',
      'Tank No.':     a.utility_type === 'water' ? (a.tank_number ?? '') : '',
      'Notes':        a.notes ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [20,12,14,14,16,16,16,14,12,20].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Utility Accounts')
    XLSX.writeFile(wb, `Utility_Accounts_${orgName.replace(/\s+/g,'_')}.xlsx`)
  }

  // ── Print / PDF ──────────────────────────────────────────────────────────
  function handlePrint() { window.print() }

  const select = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'
  const input  = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'

  return (
    <>
      {/* ── Print styles ─────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #ua-print, #ua-print * { visibility: visible; }
          #ua-print { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        <select value={filterProp} onChange={e => setFilterProp(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[160px]">
          <option value="">All Properties</option>
          {[...properties].sort((a,b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">All Utilities</option>
          {UTILITY_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
        </select>
        <span className="text-sm text-slate-500 ml-1">{visible.length} account{visible.length !== 1 ? 's' : ''}</span>
        <div className="ml-auto flex gap-2">
          <button onClick={exportExcel}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
            <FileSpreadsheet size={15}/> Excel
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700">
            <Printer size={15}/> Print / PDF
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={15}/> Add Account
          </button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div id="ua-print">
        {/* Print header */}
        <div className="hidden print:block mb-4 border-b pb-3">
          <h2 className="text-lg font-bold">{orgName} — Utility Accounts</h2>
          <p className="text-xs text-slate-500">Generated {new Date().toLocaleDateString()} by {userName}</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Property','Unit','Type','Service','Consumer No.','Meter No.','Recharge Code','Tariff','Tank No.','Notes',''].map(h => (
                  <th key={h} className={`px-3 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap${h === '' ? ' no-print' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-400">No utility accounts found. Click "Add Account" to create one.</td></tr>
              )}
              {visible.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">
                    {(a.properties as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                    {a.unit_id
                      ? ((a.units as { unit_number: string } | null)?.unit_number ?? '—')
                      : <span className="text-slate-400 italic text-xs">General</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeColor(a.utility_type)}`}>
                      {typeLabel(a.utility_type)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 capitalize">{svcLabel(a.service_type)}</td>
                  <td className="px-3 py-3 text-slate-700 font-mono text-xs">{a.consumer_no ?? '—'}</td>
                  <td className="px-3 py-3 text-slate-700 font-mono text-xs">{a.meter_number ?? '—'}</td>
                  <td className="px-3 py-3 text-slate-700 font-mono text-xs">{a.recharge_code ?? '—'}</td>
                  <td className="px-3 py-3 text-slate-600 text-xs">{a.tariff_type ?? '—'}</td>
                  <td className="px-3 py-3 text-slate-700 font-mono text-xs">{a.utility_type === 'water' ? (a.tank_number ?? '—') : ''}</td>
                  <td className="px-3 py-3 text-slate-500 text-xs max-w-[160px] truncate">{a.notes ?? ''}</td>
                  <td className="px-3 py-3 no-print">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(a)} className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50">
                        <Pencil size={14}/>
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Modal ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-base font-bold text-slate-800">{form.id ? 'Edit' : 'Add'} Utility Account</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              {/* Property */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Property *</label>
                <select value={form.property_id}
                  onChange={e => setForm(f => ({ ...f, property_id: e.target.value, unit_id: '' }))}
                  className={select} disabled={!!form.id}>
                  <option value="">Select property…</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Unit (optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unit <span className="text-slate-400 font-normal">(leave blank for General/Property-level)</span></label>
                <select value={form.unit_id}
                  onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}
                  className={select} disabled={!!form.id}>
                  <option value="">— General (no unit) —</option>
                  {formUnits.map(u => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
                </select>
              </div>

              {/* Utility type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Utility Type *</label>
                <select value={form.utility_type}
                  onChange={e => setForm(f => ({ ...f, utility_type: e.target.value }))}
                  className={select} disabled={!!form.id}>
                  {UTILITY_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
                </select>
              </div>

              {/* Service type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Service Type</label>
                <select value={form.service_type}
                  onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))}
                  className={select}>
                  {SERVICE_TYPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>

              {/* Consumer No. */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Consumer No.</label>
                <input value={form.consumer_no} onChange={e => setForm(f => ({ ...f, consumer_no: e.target.value }))}
                  placeholder="e.g. 1234567890" className={input}/>
              </div>

              {/* Meter No. / Telephone No. */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {form.utility_type === 'internet' ? 'Telephone Number' : 'Meter Number'}
                </label>
                <input value={form.meter_number} onChange={e => setForm(f => ({ ...f, meter_number: e.target.value }))}
                  placeholder={form.utility_type === 'internet' ? 'e.g. 24123456' : 'e.g. M-00123'} className={input}/>
              </div>

              {/* Recharge Code (prepaid only) */}
              {form.service_type === 'prepaid' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Recharge Code</label>
                  <input value={form.recharge_code} onChange={e => setForm(f => ({ ...f, recharge_code: e.target.value }))}
                    placeholder="Prepaid recharge code" className={input}/>
                </div>
              )}

              {/* Tariff Type (not internet) */}
              {form.utility_type !== 'internet' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tariff Type</label>
                  <input value={form.tariff_type} onChange={e => setForm(f => ({ ...f, tariff_type: e.target.value }))}
                    placeholder="e.g. Residential, Commercial" className={input}/>
                </div>
              )}

              {/* Tank Number (water only) */}
              {form.utility_type === 'water' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Water Tank No.</label>
                  <input value={form.tank_number} onChange={e => setForm(f => ({ ...f, tank_number: e.target.value }))}
                    placeholder="e.g. T-01, Tank 3" className={input}/>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Any additional notes…" className={input}/>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                <Save size={14}/> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
