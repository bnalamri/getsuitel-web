'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Shield, KeyRound, Eye, EyeOff, Globe, Languages,
  ExternalLink, Loader2, Save, Calendar, Download, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
} from 'lucide-react'
import OmrSymbol from '@/components/ui/OmrSymbol'

type Profile = { id: string; full_name: string | null; email: string; phone?: string | null; role: string; avatar_url?: string | null }
type Config  = { date_format: string; default_currency: string; currency_symbol: string; hq_contact_email?: string }
type Flag    = { feature_key: string; label: string; description: string | null; enabled_globally: boolean; branch_overrides: Record<string, boolean> }
type Branch  = { id: string; display_name: string }

const card  = 'bg-white rounded-xl border border-gray-200 p-6'
const label = 'block text-sm font-medium text-gray-700 mb-1'
const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400'
const select = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white'
const btn   = 'flex items-center gap-2 px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-60 transition-colors'

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']
const CURRENCIES = [
  { code: 'OMR', symbol: 'OMR', label: 'Omani Rial' },
  { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal (SAR)' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'USD', symbol: '$',   label: 'US Dollar (USD)'  },
  { code: 'GBP', symbol: '£',   label: 'British Pound (GBP)' },
]

function Msg({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className={`text-sm px-3 py-2 rounded-lg ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {text}
    </p>
  )
}

export default function HQSettingsClient({
  profile,
  config,
  flags: initialFlags,
  branches,
}: {
  profile: Profile | null
  config: Config | null
  flags: Flag[]
  branches: Branch[]
}) {
  const router = useRouter()
  const isAdmin = profile?.role === 'hq_admin'

  // ── Profile ──────────────────────────────────────────────────────────────
  const [name,        setName]        = useState(profile?.full_name ?? '')
  const [phone,       setPhone]       = useState(profile?.phone ?? '')
  const [profLoading, setProfLoading] = useState(false)
  const [profMsg,     setProfMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfLoading(true); setProfMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ full_name: name, phone: phone || null }).eq('id', profile!.id)
    setProfLoading(false)
    setProfMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Profile saved!' })
    if (!error) { setTimeout(() => setProfMsg(null), 3000); router.refresh() }
  }

  // ── Password ──────────────────────────────────────────────────────────────
  const [newPass,     setNewPass]     = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showNew,     setShowNew]     = useState(false)
  const [showConf,    setShowConf]    = useState(false)
  const [pwLoading,   setPwLoading]   = useState(false)
  const [pwMsg,       setPwMsg]       = useState<{ ok: boolean; text: string } | null>(null)

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setPwMsg(null)
    if (newPass.length < 8)      { setPwMsg({ ok: false, text: 'Minimum 8 characters' }); return }
    if (newPass !== confirmPass) { setPwMsg({ ok: false, text: 'Passwords do not match' }); return }
    setPwLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setPwLoading(false)
    if (error) { setPwMsg({ ok: false, text: error.message }); return }
    setPwMsg({ ok: true, text: 'Password updated!' })
    setNewPass(''); setConfirmPass('')
    setTimeout(() => setPwMsg(null), 3000)
  }

  // ── Language ──────────────────────────────────────────────────────────────
  const [lang, setLang] = useState<'en' | 'ar'>('en')

  async function handleLang(l: 'en' | 'ar') {
    setLang(l)
    const supabase = createClient()
    await supabase.from('profiles').update({ lang_pref: l }).eq('id', profile!.id)
  }

  // ── Platform Defaults ─────────────────────────────────────────────────────
  const [dateFormat,      setDateFormat]      = useState(config?.date_format       ?? 'DD/MM/YYYY')
  const [currency,        setCurrency]        = useState(config?.default_currency   ?? 'OMR')
  const [hqContactEmail,  setHqContactEmail]  = useState(config?.hq_contact_email  ?? 'hq_admin@getsuitel.com')
  const [cfgLoading,   setCfgLoading]   = useState(false)
  const [cfgMsg,       setCfgMsg]       = useState<{ ok: boolean; text: string } | null>(null)

  async function savePlatformConfig(e: React.FormEvent) {
    e.preventDefault(); setCfgLoading(true); setCfgMsg(null)
    const currencyObj = CURRENCIES.find(c => c.code === currency)
    const res = await fetch('/api/hq/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date_format:       dateFormat,
        default_currency:  currency,
        currency_symbol:   currencyObj?.symbol ?? currency,
        hq_contact_email:  hqContactEmail,
      }),
    })
    setCfgLoading(false)
    if (!res.ok) { const e = await res.json(); setCfgMsg({ ok: false, text: e.error }); return }
    setCfgMsg({ ok: true, text: 'Platform defaults saved!' })
    setTimeout(() => setCfgMsg(null), 3000)
  }

  // ── Feature Flags ─────────────────────────────────────────────────────────
  const [flags,        setFlags]        = useState<Flag[]>(initialFlags)
  const [flagExpanded, setFlagExpanded] = useState<string | null>(null)
  const [flagSaving,   setFlagSaving]   = useState<string | null>(null)

  async function toggleGlobal(key: string, current: boolean) {
    setFlagSaving(key)
    await fetch('/api/hq/flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_key: key, enabled_globally: !current }),
    })
    setFlags(prev => prev.map(f => f.feature_key === key ? { ...f, enabled_globally: !current } : f))
    setFlagSaving(null)
  }

  async function setBranchOverride(key: string, branchId: string, value: boolean | null) {
    setFlagSaving(key + branchId)
    await fetch('/api/hq/flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_key: key, branch_id: branchId, override: value }),
    })
    setFlags(prev => prev.map(f => {
      if (f.feature_key !== key) return f
      const overrides = { ...f.branch_overrides }
      if (value === null) { delete overrides[branchId] } else { overrides[branchId] = value }
      return { ...f, branch_overrides: overrides }
    }))
    setFlagSaving(null)
  }

  // ── Data Export ───────────────────────────────────────────────────────────
  const [exportLoading, setExportLoading] = useState<string | null>(null)

  async function exportData(type: 'branches' | 'billing') {
    setExportLoading(type)
    const supabase = createClient()

    let rows: Record<string, unknown>[] = []
    let filename = ''

    if (type === 'branches') {
      const { data } = await supabase
        .from('branches')
        .select('name, city, region, status, license_fee_omr, revenue_share_pct, created_at')
        .order('created_at', { ascending: false })
      rows = data ?? []
      filename = `getsuitel_branches_${today()}.csv`
    } else {
      // branch_billing's real columns (20260831_hq_layer0.sql) are month /
      // total_revenue_omr / share_amount_omr / license_fee_omr / paid_at —
      // this used to select amount_omr/due_date/paid_date, none of which
      // exist, so Postgrest rejected the query and the CSV always came out
      // empty with no visible error.
      const { data } = await supabase
        .from('branch_billing')
        .select('branches(display_name), month, total_revenue_omr, share_amount_omr, license_fee_omr, status, paid_at, notes')
        .order('month', { ascending: false })
      rows = (data ?? []).map(r => {
        const branchRow = Array.isArray(r.branches) ? r.branches[0] : r.branches
        return {
          branch: branchRow?.display_name ?? '',
          month: r.month,
          total_revenue_omr: r.total_revenue_omr,
          share_amount_omr: r.share_amount_omr,
          license_fee_omr: r.license_fee_omr,
          status: r.status,
          paid_at: r.paid_at,
          notes: r.notes,
        }
      })
      filename = `getsuitel_billing_${today()}.csv`
    }

    downloadCSV(rows, filename)
    setExportLoading(null)
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your HQ admin account &amp; platform defaults</p>
      </div>

      {/* ── Profile ── */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-yellow-600" />
          <h2 className="font-semibold text-gray-900">Profile</h2>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className={label}>Full Name</label>
            <input className={input} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+968 XXXX XXXX" type="tel" />
          </div>
          <div>
            <label className={label}>Email</label>
            <input className={`${input} bg-gray-50 text-gray-400 cursor-not-allowed`} value={profile?.email ?? ''} disabled />
          </div>
          <div>
            <label className={label}>Role</label>
            <input className={`${input} bg-gray-50 text-gray-400 cursor-not-allowed`} value={profile?.role === 'hq_admin' ? 'HQ Admin (Layer 0)' : profile?.role === 'hq_finance' ? 'HQ Finance (Layer 0)' : 'HQ Staff (Layer 0)'} disabled />
          </div>
          {profMsg && <Msg ok={profMsg.ok} text={profMsg.text} />}
          <button type="submit" disabled={profLoading} className={btn}>
            {profLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {profMsg?.ok ? 'Saved!' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* ── Language ── */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <Languages className="w-4 h-4 text-yellow-600" />
          <h2 className="font-semibold text-gray-900">Language</h2>
        </div>
        <div className="flex gap-3">
          {(['en', 'ar'] as const).map(l => (
            <button
              key={l}
              onClick={() => handleLang(l)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                lang === l
                  ? 'bg-yellow-500 text-gray-900 border-yellow-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-400'
              }`}
            >
              {l === 'en' ? 'English' : 'العربية'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Platform Defaults ── */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-yellow-600" />
          <h2 className="font-semibold text-gray-900">Platform Defaults</h2>
          <span className="ml-auto text-xs text-gray-400">Applied across all branches</span>
        </div>
        <form onSubmit={savePlatformConfig} className="space-y-4">
          <div>
            <label className={label}>Date Format</label>
            <select className={select} value={dateFormat} onChange={e => setDateFormat(e.target.value)}>
              {DATE_FORMATS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Default Currency</label>
            <select className={select} value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            {currency === 'OMR' && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span>Symbol:</span>
                <OmrSymbol variant="dark" size={18} />
              </div>
            )}
          </div>
          <div>
            <label className={label}>HQ Contact Email</label>
            <input
              type="email"
              className={input}
              value={hqContactEmail}
              onChange={e => setHqContactEmail(e.target.value)}
              placeholder="hq_admin@getsuitel.com"
            />
            <p className="text-xs text-gray-400 mt-1">Branch suspension messages are sent to this address.</p>
          </div>
          {!isAdmin && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              Read-only — only HQ Admin can change platform defaults.
            </p>
          )}
          {cfgMsg && <Msg ok={cfgMsg.ok} text={cfgMsg.text} />}
          {isAdmin && (
            <button type="submit" disabled={cfgLoading} className={btn}>
              {cfgLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <OmrSymbol variant="dark" size={16} />}
              {cfgMsg?.ok ? 'Saved!' : 'Save Defaults'}
            </button>
          )}
        </form>
      </div>

      {/* ── Change Password ── */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-yellow-600" />
          <h2 className="font-semibold text-gray-900">Change Password</h2>
        </div>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className={label}>New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                className={`${input} pr-10`}
                placeholder="Minimum 8 characters"
                required
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className={label}>Confirm New Password</label>
            <div className="relative">
              <input
                type={showConf ? 'text' : 'password'}
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                className={`${input} pr-10`}
                placeholder="Re-enter new password"
                required
              />
              <button type="button" onClick={() => setShowConf(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {pwMsg && <Msg ok={pwMsg.ok} text={pwMsg.text} />}
          <button type="submit" disabled={pwLoading} className={btn}>
            {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {pwMsg?.ok ? 'Updated!' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* ── Data Export ── */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-4 h-4 text-yellow-600" />
          <h2 className="font-semibold text-gray-900">Data Export</h2>
          <span className="ml-auto text-xs text-gray-400">Downloads as CSV</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-800">Branches Report</p>
              <p className="text-xs text-gray-400">Name, city, region, status, fees</p>
            </div>
            <button
              onClick={() => exportData('branches')}
              disabled={exportLoading === 'branches'}
              className="flex items-center gap-1.5 px-4 py-2 border border-yellow-400 text-yellow-700 hover:bg-yellow-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {exportLoading === 'branches'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              Export
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Billing Records</p>
              <p className="text-xs text-gray-400">All branch billing history</p>
            </div>
            <button
              onClick={() => exportData('billing')}
              disabled={exportLoading === 'billing'}
              className="flex items-center gap-1.5 px-4 py-2 border border-yellow-400 text-yellow-700 hover:bg-yellow-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {exportLoading === 'billing'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              Export
            </button>
          </div>
        </div>
      </div>

      {/* ── Feature Flags ── */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <ToggleRight className="w-4 h-4 text-yellow-600" />
          <h2 className="font-semibold text-gray-900">Feature Flags</h2>
          <span className="ml-auto text-xs text-gray-400">Toggle platform features per branch</span>
        </div>
        {flags.length === 0 ? (
          <p className="text-sm text-gray-400">No feature flags found. Run the Batch G SQL migration first.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {flags.map(f => {
              const isOpen = flagExpanded === f.feature_key
              const overrideCount = Object.keys(f.branch_overrides).length
              return (
                <div key={f.feature_key}>
                  <div className="flex items-center gap-3 py-3">
                    {/* Global toggle */}
                    <button
                      onClick={() => isAdmin && toggleGlobal(f.feature_key, f.enabled_globally)}
                      disabled={!isAdmin || flagSaving === f.feature_key}
                      className="flex-shrink-0 text-gray-400 disabled:opacity-50 transition-colors"
                      title={!isAdmin ? 'Only HQ Admin can change feature flags' : f.enabled_globally ? 'Disable globally' : 'Enable globally'}
                    >
                      {f.enabled_globally
                        ? <ToggleRight className="w-6 h-6 text-green-500" />
                        : <ToggleLeft  className="w-6 h-6 text-gray-300" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{f.label}</p>
                      {f.description && <p className="text-xs text-gray-400 mt-0.5">{f.description}</p>}
                    </div>
                    {overrideCount > 0 && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        {overrideCount} override{overrideCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {branches.length > 0 && (
                      <button
                        onClick={() => setFlagExpanded(isOpen ? null : f.feature_key)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Per-branch overrides"
                      >
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  {/* Per-branch override panel */}
                  {isOpen && (
                    <div className="bg-gray-50 rounded-lg mb-3 p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Branch Overrides</p>
                      {branches.map(b => {
                        const override = f.branch_overrides[b.id]
                        const isSaving = flagSaving === f.feature_key + b.id
                        return (
                          <div key={b.id} className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 flex-1 truncate">{b.display_name}</span>
                            <div className="flex gap-1.5 text-xs">
                              {(['Inherit', 'On', 'Off'] as const).map(opt => {
                                const val = opt === 'Inherit' ? null : opt === 'On'
                                const active =
                                  (opt === 'Inherit' && override === undefined) ||
                                  (opt === 'On'      && override === true)      ||
                                  (opt === 'Off'     && override === false)
                                return (
                                  <button
                                    key={opt}
                                    disabled={!isAdmin || isSaving}
                                    onClick={() => isAdmin && setBranchOverride(f.feature_key, b.id, val)}
                                    className={`px-2.5 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
                                      active
                                        ? opt === 'On'  ? 'bg-green-500 text-white'
                                        : opt === 'Off' ? 'bg-red-400 text-white'
                                        : 'bg-gray-300 text-gray-700'
                                        : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Platform Info ── */}
      <div className={card}>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-yellow-600" />
          <h2 className="font-semibold text-gray-900">Platform</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Website</span>
            <a href="https://getsuitel.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-yellow-700 hover:underline">
              getsuitel.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Role</span>
            <span className="text-sm font-semibold text-gray-800">
              {profile?.role === 'hq_admin' ? 'HQ Admin' : 'HQ Staff'} · Layer 0
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Access Level</span>
            <span className="text-sm text-gray-600">
              {profile?.role === 'hq_admin' ? 'Global read/write across all branches' : 'Global read access across all branches'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-500">Version</span>
            <span className="text-sm font-mono text-gray-500">1.0.2</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0]
}

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(r =>
      headers.map(h => {
        const v = r[h] ?? ''
        return typeof v === 'string' && v.includes(',') ? `"${v}"` : v
      }).join(',')
    ),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
