'use client'
import { useState, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save, Copy, Check, Globe } from 'lucide-react'
import { DateFormatContext, type DateFormat } from '@/contexts/DateFormatContext'
import { COUNTRIES, getUTCOffset } from '@/lib/countries'

export default function OrgSettingsForm({
  org, userId, orgId, platformCurrency = 'OMR',
}: {
  org: Record<string, unknown> | null
  userId: string
  orgId: string | null
  platformCurrency?: string
}) {
  const [loading, setLoading]   = useState(false)
  const [saved, setSaved]       = useState(false)
  const [copied, setCopied]     = useState(false)
  const router                  = useRouter()
  const { dateFormat, setDateFormat } = useContext(DateFormatContext)

  const inviteCode = orgId ? orgId.replace(/-/g, '').substring(0, 8).toUpperCase() : null

  function copyCode() {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Derive saved city from stored country + timezone ──────────────────────
  function getSavedCity(country: string, tz: string): string {
    if (!country || !tz || tz === 'UTC') return ''
    return COUNTRIES.find(c => c.name === country)?.zones.find(z => z.tz === tz)?.city ?? ''
  }

  const savedCountry = (org?.country as string) ?? ''
  const savedTz      = (org?.org_timezone as string) ?? 'UTC'

  const [form, setForm] = useState({
    name:             (org?.name as string)             ?? '',
    name_ar:          (org?.name_ar as string)          ?? '',
    date_format:      (org?.date_format as DateFormat)  ?? dateFormat,
    default_currency: (org?.default_currency as string) ?? platformCurrency,
    country:          savedCountry,
    org_timezone:     savedTz,
  })

  // city is local UI state — drives the city <select>, maps to org_timezone
  const [city, setCity] = useState<string>(() => getSavedCity(savedCountry, savedTz))

  // Country options: current zones for the selected country
  const selectedCountry = COUNTRIES.find(c => c.name === form.country)

  function handleCountryChange(countryName: string) {
    const c = COUNTRIES.find(x => x.name === countryName)
    // Auto-select only city when there's exactly one zone
    const autoCity = c?.zones.length === 1 ? c.zones[0].city : ''
    const autoTz   = c?.zones.length === 1 ? c.zones[0].tz   : 'UTC'
    setCity(autoCity)
    setForm(f => ({ ...f, country: countryName, org_timezone: autoTz }))
  }

  function handleCityChange(cityName: string) {
    const zone = selectedCountry?.zones.find(z => z.city === cityName)
    setCity(cityName)
    if (zone) setForm(f => ({ ...f, org_timezone: zone.tz }))
  }

  const tzOffset      = form.org_timezone !== 'UTC' && city ? getUTCOffset(form.org_timezone) : ''
  const tzReady       = form.country !== '' && city !== '' && form.org_timezone !== 'UTC'
  const isMultiZone   = (selectedCountry?.zones.length ?? 0) > 1

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.country) { alert('Please select your country.'); return }
    if (!city)         { alert('Please select your city / region.'); return }
    setLoading(true)
    const supabase = createClient()
    if (orgId) {
      await supabase.from('organizations').update(form).eq('id', orgId)
      setDateFormat(form.date_format as DateFormat)
    } else {
      const { data } = await supabase
        .from('organizations')
        .insert({ ...form, owner_id: userId })
        .select('id')
        .single()
      if (data?.id) await supabase.from('profiles').update({ organization_id: data.id }).eq('id', userId)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-slate-900 mb-1">Organization</h3>
      <p className="text-slate-500 text-sm mb-4">
        {orgId ? 'Update your company details' : 'Set up your organization to start managing properties'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Names */}
        <div>
          <label className="label">Company Name (English)</label>
          <input className="input" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Oakwood Properties LLC" />
        </div>
        <div>
          <label className="label">Company Name (Arabic)</label>
          <input className="input" dir="rtl" value={form.name_ar}
            onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
            placeholder="شركة النور للعقارات" />
        </div>

        {/* Country + City */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              className="input"
              required
              value={form.country}
              onChange={e => handleCountryChange(e.target.value)}
            >
              <option value="">— Select country —</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              City / Region <span className="text-red-500">*</span>
              {isMultiZone && <span className="text-slate-400 font-normal"> (multiple time zones)</span>}
            </label>
            <select
              className="input"
              required
              value={city}
              disabled={!form.country}
              onChange={e => handleCityChange(e.target.value)}
            >
              <option value="">— Select city —</option>
              {selectedCountry?.zones.map(z => (
                <option key={z.tz} value={z.city}>{z.city}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Timezone confirmation */}
        {tzReady && (
          <div className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <Globe size={15} className="text-blue-500 shrink-0" />
            <span className="text-blue-800">
              Automated jobs (invoicing, snapshots) will run at{' '}
              <strong>midnight · {form.org_timezone}</strong>
              {tzOffset && <span className="text-blue-600"> ({tzOffset})</span>}
            </span>
          </div>
        )}

        {/* Date format */}
        <div>
          <label className="label">Date Format</label>
          <select className="input" value={form.date_format}
            onChange={e => setForm(f => ({ ...f, date_format: e.target.value as DateFormat }))}>
            <option value="dd/mm/yyyy">DD/MM/YYYY — e.g. 25/07/2026</option>
            <option value="mm/dd/yyyy">MM/DD/YYYY — e.g. 07/25/2026</option>
            <option value="yyyy-mm-dd">YYYY-MM-DD — e.g. 2026-07-25</option>
          </select>
        </div>

        {/* Default currency */}
        <div>
          <label className="label">Default Currency</label>
          <select className="input" value={form.default_currency}
            onChange={e => setForm(f => ({ ...f, default_currency: e.target.value }))}>
            <option value="OMR">OMR — Omani Rial</option>
            <option value="SAR">SAR — Saudi Riyal</option>
            <option value="AED">AED — UAE Dirham</option>
            <option value="KWD">KWD — Kuwaiti Dinar</option>
            <option value="QAR">QAR — Qatari Riyal</option>
            <option value="BHD">BHD — Bahraini Dinar</option>
            <option value="USD">USD — US Dollar</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="EUR">EUR — Euro</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">Used as the default currency for invoices and financial reports.</p>
        </div>

        {/* Plan / status badges */}
        {org && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-500">Plan</div>
              <div className="font-semibold capitalize text-slate-900 mt-0.5">{org.subscription_plan as string}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-500">Status</div>
              <div className="font-semibold capitalize text-slate-900 mt-0.5">{org.subscription_status as string}</div>
            </div>
          </div>
        )}

        {/* Invite code */}
        {inviteCode && (
          <div className="bg-navy-50 border border-navy-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-navy-800 mb-1">Invite Code</div>
            <div className="text-xs text-navy-600 mb-3">
              Share this code with tenants and technicians so they can join your organization when registering.
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-lg font-black tracking-widest text-navy-900 bg-white border border-navy-200 rounded-lg px-4 py-2">
                {inviteCode}
              </div>
              <button type="button" onClick={copyCode}
                className="flex items-center gap-1.5 btn-secondary text-xs px-3 py-2">
                {copied ? <><Check size={13} />Copied!</> : <><Copy size={13} />Copy</>}
              </button>
            </div>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Saved!' : orgId ? 'Save Changes' : 'Create Organization'}
        </button>
      </form>
    </div>
  )
}
