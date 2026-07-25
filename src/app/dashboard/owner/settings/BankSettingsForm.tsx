'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Trash2, Building2, RefreshCw } from 'lucide-react'

interface Bank { id: string; name: string }

// Full list of licensed banks in Oman (CBB list)
const OMANI_BANK_DEFAULTS = [
  'Bank Muscat', 'Bank Dhofar', 'National Bank of Oman',
  'HSBC Oman', 'Ahli Bank', 'Oman Arab Bank',
  'Alizz Islamic Bank', 'Bank Nizwa', 'Sohar International',
  'First Abu Dhabi Bank (Oman)', 'Standard Chartered Oman',
  'Citibank Oman', 'Qatar National Bank (Oman)', 'Arab Bank Oman',
  'Habib Bank AG Zurich (Oman)', 'Bank of Baroda (Oman)',
  'State Bank of India (Oman)', 'Indian Bank (Oman)',
]

export default function BankSettingsForm({
  orgId,
  initialBanks,
}: {
  orgId: string
  initialBanks: Bank[]
}) {
  const [banks, setBanks]       = useState<Bank[]>(initialBanks)
  const [newName, setNewName]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [seeding, setSeeding]   = useState(false)
  const [error, setError]       = useState('')

  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function addBank() {
    const name = newName.trim()
    if (!name) return
    if (banks.some(b => b.name.toLowerCase() === name.toLowerCase())) {
      setError('Bank already in list'); return
    }
    setLoading(true); setError('')
    const { data, error: err } = await sb.from('org_banks')
      .insert({ organization_id: orgId, name })
      .select('id, name')
      .single()
    if (err) setError(err.message)
    else if (data) { setBanks(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name))); setNewName('') }
    setLoading(false)
  }

  async function deleteBank(id: string) {
    await sb.from('org_banks').delete().eq('id', id)
    setBanks(prev => prev.filter(b => b.id !== id))
  }

  async function loadDefaults() {
    setSeeding(true)
    const existing = new Set(banks.map(b => b.name.toLowerCase()))
    const toInsert = OMANI_BANK_DEFAULTS.filter(n => !existing.has(n.toLowerCase()))
      .map(name => ({ organization_id: orgId, name }))
    if (toInsert.length === 0) { setSeeding(false); return }
    const { data } = await sb.from('org_banks').insert(toInsert).select('id, name')
    if (data) setBanks(prev => [...prev, ...data].sort((a, b) => a.name.localeCompare(b.name)))
    setSeeding(false)
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-navy-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">Banks</h3>
            <p className="text-sm text-slate-500">Manage the bank list used when registering cheques</p>
          </div>
        </div>
        <button
          onClick={loadDefaults}
          disabled={seeding}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-navy-700 border border-slate-200 hover:border-navy-300 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
          title="Load all standard Omani banks"
        >
          <RefreshCw size={12} className={seeding ? 'animate-spin' : ''} />
          {seeding ? 'Loading…' : 'Load Omani defaults'}
        </button>
      </div>

      {/* Bank list */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {banks.length === 0 && (
          <p className="text-sm text-slate-400 italic py-2 text-center">
            No banks yet — click "Load Omani defaults" or add one below.
          </p>
        )}
        {banks.map(b => (
          <div key={b.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 group">
            <span className="text-sm text-slate-700">{b.name}</span>
            <button
              onClick={() => deleteBank(b.id)}
              className="text-slate-200 group-hover:text-red-400 hover:!text-red-600 transition-colors"
              title="Remove"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Add custom bank */}
      <div className="space-y-1.5 pt-1 border-t border-slate-100">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Add custom bank</p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="e.g. My Local Bank"
            value={newName}
            onChange={e => { setNewName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && addBank()}
            maxLength={80}
          />
          <button
            onClick={addBank}
            disabled={loading || !newName.trim()}
            className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Plus size={14} />
            {loading ? 'Adding…' : 'Add'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  )
}
