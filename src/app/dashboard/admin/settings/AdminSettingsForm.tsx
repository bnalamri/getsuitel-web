'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useShell } from '@/components/layout/DashboardShell'
import { Loader2, Save, Shield, KeyRound, Eye, EyeOff, Globe, Building2, Smartphone, Languages, ExternalLink } from 'lucide-react'

const CURRENCIES = ['OMR','SAR','AED','KWD','QAR','BHD','USD','GBP','EUR']
const CURRENCY_LABELS: Record<string, string> = {
  OMR:'OMR — Omani Rial', SAR:'SAR — Saudi Riyal', AED:'AED — UAE Dirham',
  KWD:'KWD — Kuwaiti Dinar', QAR:'QAR — Qatari Riyal', BHD:'BHD — Bahraini Dinar',
  USD:'USD — US Dollar', GBP:'GBP — British Pound', EUR:'EUR — Euro',
}

const TIMEZONES = [
  { value: 'Asia/Muscat',  label: 'Asia/Muscat — Oman (GST +4)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh — Saudi Arabia (AST +3)' },
  { value: 'Asia/Dubai',  label: 'Asia/Dubai — UAE (GST +4)' },
  { value: 'Asia/Kuwait', label: 'Asia/Kuwait — Kuwait (AST +3)' },
  { value: 'Asia/Qatar',  label: 'Asia/Qatar — Qatar (AST +3)' },
  { value: 'Asia/Bahrain',label: 'Asia/Bahrain — Bahrain (AST +3)' },
  { value: 'Africa/Cairo',label: 'Africa/Cairo — Egypt (EET +2)' },
  { value: 'Europe/London',label:'Europe/London — UK (GMT/BST)' },
  { value: 'UTC',          label: 'UTC' },
]

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']

export default function AdminSettingsForm({ profile }: { profile: Record<string, unknown> | null }) {
  const [loading, setLoading]   = useState(false)
  const [saved, setSaved]       = useState(false)
  const router = useRouter()
  const { lang, setLang } = useShell()
  const [fullName, setFullName] = useState((profile?.full_name as string) ?? '')

  // ── Branch identity state ────────────────────────────────────────────────
  const [branchName,     setBranchName]     = useState((profile?.branch_name as string) ?? '')
  const [branchLogoUrl,  setBranchLogoUrl]  = useState((profile?.branch_logo_url as string) ?? '')
  const [branchLoading,  setBranchLoading]  = useState(false)
  const [branchSaved,    setBranchSaved]    = useState(false)
  const [branchError,    setBranchError]    = useState('')

  // ── Platform settings state ──────────────────────────────────────────────
  const [platformCurrency,   setPlatformCurrency]   = useState('OMR')
  const [platformName,       setPlatformName]       = useState('GetSuitel')
  const [defaultTimezone,    setDefaultTimezone]    = useState('Asia/Muscat')
  const [defaultDateFormat,  setDefaultDateFormat]  = useState('DD/MM/YYYY')
  const [psLoading, setPsLoading] = useState(false)
  const [psSaved,   setPsSaved]   = useState(false)
  const [psError,   setPsError]   = useState('')

  // ── Platform payment details ─────────────────────────────────────────────
  const [payBankName,     setPayBankName]     = useState('')
  const [payAccountName,  setPayAccountName]  = useState('')
  const [payIban,         setPayIban]         = useState('')
  const [payMobileWallet, setPayMobileWallet] = useState('')
  const [payMobileLabel,  setPayMobileLabel]  = useState('Mobile Wallet')
  const [ppLoading, setPpLoading] = useState(false)
  const [ppSaved,   setPpSaved]   = useState(false)
  const [ppError,   setPpError]   = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('platform_settings').select('key, value')
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, string> = {}
        data.forEach(r => { map[r.key] = r.value })
        if (map.default_currency)  setPlatformCurrency(map.default_currency)
        if (map.platform_name)     setPlatformName(map.platform_name)
        if (map.default_timezone)  setDefaultTimezone(map.default_timezone)
        if (map.default_date_format) setDefaultDateFormat(map.default_date_format)
        if (map.payment_bank_name)     setPayBankName(map.payment_bank_name)
        if (map.payment_account_name)  setPayAccountName(map.payment_account_name)
        if (map.payment_iban)          setPayIban(map.payment_iban)
        if (map.payment_mobile_wallet) setPayMobileWallet(map.payment_mobile_wallet)
        if (map.payment_mobile_label)  setPayMobileLabel(map.payment_mobile_label)
      })
  }, [])

  async function handlePlatformSettings(e: React.FormEvent) {
    e.preventDefault()
    setPsLoading(true); setPsError('')
    const res = await fetch('/api/admin/platform-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        default_currency:    platformCurrency,
        platform_name:       platformName,
        default_timezone:    defaultTimezone,
        default_date_format: defaultDateFormat,
      }),
    })
    if (!res.ok) { const d = await res.json(); setPsError(d.error ?? 'Error saving') }
    else { setPsSaved(true); setTimeout(() => setPsSaved(false), 3000) }
    setPsLoading(false)
  }

  async function handlePaymentSettings(e: React.FormEvent) {
    e.preventDefault()
    setPpLoading(true); setPpError('')
    const res = await fetch('/api/admin/platform-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_bank_name:     payBankName,
        payment_account_name:  payAccountName,
        payment_iban:          payIban,
        payment_mobile_wallet: payMobileWallet,
        payment_mobile_label:  payMobileLabel,
      }),
    })
    if (!res.ok) { const d = await res.json(); setPpError(d.error ?? 'Error saving') }
    else { setPpSaved(true); setTimeout(() => setPpSaved(false), 3000) }
    setPpLoading(false)
  }

  // ── Password change ──────────────────────────────────────────────────────
  const [pwLoading, setPwLoading]     = useState(false)
  const [pwSaved,   setPwSaved]       = useState(false)
  const [pwError,   setPwError]       = useState('')
  const [newPass,   setNewPass]       = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showNew,   setShowNew]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleLangChange(newLang: 'en' | 'ar') {
    setLang(newLang)
    const supabase = createClient()
    await supabase.from('profiles').update({ lang_pref: newLang }).eq('id', profile?.id as string)
  }

  async function handleBranchIdentity(e: React.FormEvent) {
    e.preventDefault(); setBranchError('')
    setBranchLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles')
      .update({ branch_name: branchName || null, branch_logo_url: branchLogoUrl || null })
      .eq('id', profile?.id as string)
    setBranchLoading(false)
    if (error) { setBranchError(error.message); return }
    setBranchSaved(true); setTimeout(() => setBranchSaved(false), 3000)
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile?.id as string)
    setSaved(true); setTimeout(() => setSaved(false), 3000)
    router.refresh(); setLoading(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault(); setPwError('')
    if (newPass.length < 8) { setPwError('Password must be at least 8 characters'); return }
    if (newPass !== confirmPass) { setPwError('Passwords do not match'); return }
    setPwLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setPwLoading(false)
    if (error) { setPwError(error.message); return }
    setPwSaved(true); setNewPass(''); setConfirmPass('')
    setTimeout(() => setPwSaved(false), 3000)
  }

  return (
    <div className="space-y-6">

      {/* ── Branch Identity ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={16} className="text-gold-600" />
          <h3 className="font-semibold text-slate-900">Branch Identity</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Configure your GetSuitel branch. Your sidebar will display <strong>GetSuitel — [Branch Name] Branch</strong>.
          Leave blank to show the standard GetSuitel branding.
        </p>
        <form onSubmit={handleBranchIdentity} className="space-y-4">
          <div>
            <label className="label">Branch Name</label>
            <input className="input" value={branchName} onChange={e => setBranchName(e.target.value)}
              placeholder="e.g. Riyadh, Dubai, Kuwait City" />
            <p className="text-xs text-slate-400 mt-1">Displayed as: GetSuitel — {branchName || 'Riyadh'} Branch</p>
          </div>
          <div>
            <label className="label">Branch Logo URL <span className="text-slate-400 font-normal">(optional co-brand)</span></label>
            <input className="input" value={branchLogoUrl} onChange={e => setBranchLogoUrl(e.target.value)}
              placeholder="https://yourbrand.com/logo.png" />
          </div>
          {branchError && <p className="text-red-600 text-sm">{branchError}</p>}
          <button type="submit" disabled={branchLoading}
            className="btn-primary flex items-center gap-2 text-sm">
            {branchLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {branchSaved ? 'Saved!' : 'Save Branch Identity'}
          </button>
        </form>
      </div>

      {/* ── Platform Settings ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} className="text-navy-700" />
          <h3 className="font-semibold text-slate-900">Platform Settings</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">Default settings inherited by new organizations on signup.</p>
        <form onSubmit={handlePlatformSettings} className="space-y-4">
          <div>
            <label className="label">Platform Name</label>
            <input className="input" value={platformName} onChange={e => setPlatformName(e.target.value)} placeholder="GetSuitel" />
          </div>
          <div>
            <label className="label">Default Currency for New Organizations</label>
            <select className="input" value={platformCurrency} onChange={e => setPlatformCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">New owners will have this currency pre-selected. They can change it in their own settings.</p>
          </div>
          <div>
            <label className="label">Default Timezone</label>
            <select className="input" value={defaultTimezone} onChange={e => setDefaultTimezone(e.target.value)}>
              {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Default Date Format</label>
            <select className="input" value={defaultDateFormat} onChange={e => setDefaultDateFormat(e.target.value)}>
              {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          {psError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{psError}</div>}
          {psSaved && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2.5 rounded-lg">Platform settings saved!</div>}
          <button type="submit" disabled={psLoading} className="btn-primary flex items-center gap-2">
            {psLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {psSaved ? 'Saved!' : 'Save Platform Settings'}
          </button>
        </form>
      </div>

      {/* ── Platform Payment Details ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={16} className="text-navy-700" />
          <h3 className="font-semibold text-slate-900">Platform Payment Details</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">Bank and mobile wallet details for GetSuitel subscription payments.</p>
        <form onSubmit={handlePaymentSettings} className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-1">
            <Building2 size={14} /> Bank Transfer
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Bank Name</label>
              <input className="input" value={payBankName} onChange={e => setPayBankName(e.target.value)} placeholder="Bank Muscat" />
            </div>
            <div>
              <label className="label">Account Name</label>
              <input className="input" value={payAccountName} onChange={e => setPayAccountName(e.target.value)} placeholder="GetSuitel LLC" />
            </div>
            <div className="col-span-2">
              <label className="label">IBAN</label>
              <input className="input font-mono" value={payIban} onChange={e => setPayIban(e.target.value)} placeholder="OM00 0000 0000 0000 0000 0000" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 mt-2 mb-1">
            <Smartphone size={14} /> Mobile Wallet
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Wallet Number</label>
              <input className="input" value={payMobileWallet} onChange={e => setPayMobileWallet(e.target.value)} placeholder="+968 9000 0000" />
            </div>
            <div>
              <label className="label">Label (e.g. OmanNet, Thawani)</label>
              <input className="input" value={payMobileLabel} onChange={e => setPayMobileLabel(e.target.value)} placeholder="Mobile Wallet" />
            </div>
          </div>
          {ppError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{ppError}</div>}
          {ppSaved && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2.5 rounded-lg">Payment details saved!</div>}
          <button type="submit" disabled={ppLoading} className="btn-primary flex items-center gap-2">
            {ppLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {ppSaved ? 'Saved!' : 'Save Payment Details'}
          </button>
        </form>
      </div>

      {/* ── Admin Profile ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-navy-700" />
          <h3 className="font-semibold text-slate-900">Admin Profile</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Full Name</label><input className="input" value={fullName} onChange={e => setFullName(e.target.value)} /></div>
          <div><label className="label">Email</label><input className="input bg-slate-50 text-slate-400 cursor-not-allowed" value={profile?.email as string} disabled /></div>
          <div><label className="label">Role</label><input className="input bg-slate-50 text-slate-400 cursor-not-allowed" value="Superadmin" disabled /></div>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* ── Language ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Languages size={16} className="text-navy-700" />
          <h3 className="font-semibold text-slate-900">Language</h3>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleLangChange('en')}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
              lang === 'en'
                ? 'bg-navy-700 text-white border-navy-700'
                : 'bg-white text-slate-600 border-slate-200 hover:border-navy-300'
            }`}
          >
            English
          </button>
          <button
            onClick={() => handleLangChange('ar')}
            className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
              lang === 'ar'
                ? 'bg-navy-700 text-white border-navy-700'
                : 'bg-white text-slate-600 border-slate-200 hover:border-navy-300'
            }`}
          >
            العربية
          </button>
        </div>
      </div>

      {/* ── Change Password ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={16} className="text-navy-700" />
          <h3 className="font-semibold text-slate-900">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)}
                className="input pr-10" placeholder="Minimum 8 characters" required />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                className="input pr-10" placeholder="Re-enter new password" required />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {pwError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{pwError}</div>}
          {pwSaved && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2.5 rounded-lg">Password updated successfully!</div>}
          <button type="submit" disabled={pwLoading} className="btn-primary flex items-center gap-2">
            {pwLoading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {pwSaved ? 'Updated!' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* ── Platform ── */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-navy-700" />
          <h3 className="font-semibold text-slate-900">Platform</h3>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-500">Website</span>
            <a
              href="https://getsuitel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline"
            >
              getsuitel.com
              <ExternalLink size={13} />
            </a>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-500">Role</span>
            <span className="text-sm font-semibold text-slate-800">Superadmin</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-500">Version</span>
            <span className="text-sm font-mono text-slate-600">1.0.2</span>
          </div>
        </div>
      </div>

    </div>
  )
}
