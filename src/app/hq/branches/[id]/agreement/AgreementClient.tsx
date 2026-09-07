'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Save, FileDown, Upload, CheckCircle2,
  FileText, Clock, AlertCircle, ChevronDown, ChevronRight, Zap,
} from 'lucide-react'

interface Limits {
  max_units: number | null
  max_staff: number | null
  max_tenants: number | null
  max_orgs: number | null
}

interface AgreementData {
  hq_legal_name?: string | null
  hq_legal_name_ar?: string | null
  hq_address?: string | null
  hq_address_ar?: string | null
  hq_registration?: string | null
  hq_representative?: string | null
  hq_representative_ar?: string | null
  branch_legal_name?: string | null
  branch_legal_name_ar?: string | null
  branch_address?: string | null
  branch_address_ar?: string | null
  branch_registration?: string | null
  branch_representative?: string | null
  branch_representative_ar?: string | null
  effective_date?: string | null
  duration_years?: number | null
  payment_due_day?: number | null
  notice_period_days?: number | null
  auto_renewal?: boolean | null
  hq_obligations?: string | null
  hq_obligations_ar?: string | null
  branch_obligations?: string | null
  branch_obligations_ar?: string | null
  jurisdiction?: string | null
  jurisdiction_ar?: string | null
  governing_law?: string | null
  governing_law_ar?: string | null
  dispute_resolution?: string | null
  dispute_resolution_ar?: string | null
  custom_clauses?: string | null
  custom_clauses_ar?: string | null
  exported_at?: string | null
  signed_doc_url?: string | null
  signed_doc_name?: string | null
  signed_at?: string | null
}

interface Props {
  branchId: string
  branchName: string
  branchCity: string | null
  branchCountry: string | null
  limits: Limits
  initialData: AgreementData | null
}

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between py-3 text-left"
    >
      <span className="text-base font-semibold text-gray-900">{title}</span>
      {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
    </button>
  )
}

function Input({ label, name, value, onChange, type = 'text', placeholder, required, hint, rtl }: {
  label: string; name: string; value: string | number; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean; hint?: string; rtl?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        dir={rtl ? 'rtl' : undefined}
        className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${rtl ? 'text-right font-arabic' : ''}`}
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function Textarea({ label, name, value, onChange, rows = 4, hint, rtl }: {
  label: string; name: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string; rtl?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        name={name}
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        dir={rtl ? 'rtl' : undefined}
        className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${rtl ? 'text-right font-arabic' : ''}`}
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

// A field paired with its Arabic counterpart, shown side by side on desktop
// — this IS the legal-content field for exports now (no more auto
// translation), so both language boxes sit at equal visual weight.
function BilingualField({ enLabel, arLabel, enValue, onEnChange, arValue, onArChange, rows, isTextarea, type, placeholder, hint, required }: {
  enLabel: string; arLabel: string
  enValue: string; onEnChange: (v: string) => void
  arValue: string; onArChange: (v: string) => void
  rows?: number; isTextarea?: boolean; type?: string; placeholder?: string; hint?: string; required?: boolean
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {isTextarea ? (
        <Textarea label={enLabel} name="" value={enValue} onChange={onEnChange} rows={rows} />
      ) : (
        <Input label={enLabel} name="" value={enValue} onChange={onEnChange} type={type} placeholder={placeholder} required={required} />
      )}
      {isTextarea ? (
        <Textarea label={arLabel} name="" value={arValue} onChange={onArChange} rows={rows} rtl />
      ) : (
        <Input label={arLabel} name="" value={arValue} onChange={onArChange} rtl />
      )}
      {hint && <p className="sm:col-span-2 -mt-2 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function Divider() {
  return <hr className="border-gray-100 my-1" />
}

export default function AgreementClient({ branchId, branchName, branchCity, branchCountry, limits, initialData }: Props) {
  const d = initialData

  // Form state
  const [hqLegalName, setHqLegalName] = useState(d?.hq_legal_name ?? '')
  const [hqLegalNameAr, setHqLegalNameAr] = useState(d?.hq_legal_name_ar ?? '')
  const [hqAddress, setHqAddress] = useState(d?.hq_address ?? '')
  const [hqAddressAr, setHqAddressAr] = useState(d?.hq_address_ar ?? '')
  const [hqRegistration, setHqRegistration] = useState(d?.hq_registration ?? '')
  const [hqRep, setHqRep] = useState(d?.hq_representative ?? '')
  const [hqRepAr, setHqRepAr] = useState(d?.hq_representative_ar ?? '')
  const [branchLegalName, setBranchLegalName] = useState(d?.branch_legal_name ?? branchName)
  const [branchLegalNameAr, setBranchLegalNameAr] = useState(d?.branch_legal_name_ar ?? '')
  const [branchAddress, setBranchAddress] = useState(d?.branch_address ?? [branchCity, branchCountry].filter(Boolean).join(', '))
  const [branchAddressAr, setBranchAddressAr] = useState(d?.branch_address_ar ?? '')
  const [branchRegistration, setBranchRegistration] = useState(d?.branch_registration ?? '')
  const [branchRep, setBranchRep] = useState(d?.branch_representative ?? '')
  const [branchRepAr, setBranchRepAr] = useState(d?.branch_representative_ar ?? '')
  const [effectiveDate, setEffectiveDate] = useState(d?.effective_date ?? '')
  const [durationYears, setDurationYears] = useState(String(d?.duration_years ?? 1))
  const [paymentDueDay, setPaymentDueDay] = useState(String(d?.payment_due_day ?? 1))
  const [noticeDays, setNoticeDays] = useState(String(d?.notice_period_days ?? 30))
  const [autoRenewal, setAutoRenewal] = useState(d?.auto_renewal ?? true)
  const [hqObligations, setHqObligations] = useState(d?.hq_obligations ?? 'HQ shall provide the Branch with access to the GetSuitel platform, ongoing technical support, training materials, platform updates, and operational guidelines.')
  const [hqObligationsAr, setHqObligationsAr] = useState(d?.hq_obligations_ar ?? 'يلتزم المقر الرئيسي بتزويد الفرع بإمكانية الوصول إلى منصة جيت سويتل، والدعم الفني المستمر، والمواد التدريبية، وتحديثات المنصة، والإرشادات التشغيلية.')
  const [branchObligations, setBranchObligations] = useState(d?.branch_obligations ?? 'The Branch shall operate in accordance with HQ guidelines, maintain accurate data, pay all fees on time, protect user data in compliance with applicable laws, and report any operational issues promptly.')
  const [branchObligationsAr, setBranchObligationsAr] = useState(d?.branch_obligations_ar ?? 'يلتزم الفرع بالعمل وفقاً لإرشادات المقر الرئيسي، والحفاظ على دقة البيانات، وسداد جميع الرسوم في مواعيدها، وحماية بيانات المستخدمين وفقاً للقوانين المعمول بها، والإبلاغ الفوري عن أي مشكلات تشغيلية.')
  const [jurisdiction, setJurisdiction] = useState(d?.jurisdiction ?? 'Sultanate of Oman')
  const [jurisdictionAr, setJurisdictionAr] = useState(d?.jurisdiction_ar ?? 'سلطنة عُمان')
  const [governingLaw, setGoverningLaw] = useState(d?.governing_law ?? 'Laws of the Sultanate of Oman')
  const [governingLawAr, setGoverningLawAr] = useState(d?.governing_law_ar ?? 'قوانين سلطنة عُمان')
  const [disputeRes, setDisputeRes] = useState(d?.dispute_resolution ?? 'Commercial Court of Muscat')
  const [disputeResAr, setDisputeResAr] = useState(d?.dispute_resolution_ar ?? 'المحكمة التجارية بمسقط')
  const [customClauses, setCustomClauses] = useState(d?.custom_clauses ?? '')
  const [customClausesAr, setCustomClausesAr] = useState(d?.custom_clauses_ar ?? '')

  // Sections open/closed
  const [openSections, setOpenSections] = useState({ parties: true, commercial: true, obligations: false, law: false, custom: false })
  const toggle = (k: keyof typeof openSections) => setOpenSections(s => ({ ...s, [k]: !s[k] }))

  // Status
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [exporting, setExporting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [signedUrl, setSignedUrl] = useState(d?.signed_doc_url ?? null)
  const [signedName, setSignedName] = useState(d?.signed_doc_name ?? null)
  const [exportedAt, setExportedAt] = useState(d?.exported_at ?? null)
  const [signedAt, setSignedAt] = useState(d?.signed_at ?? null)
  const [activationMsg, setActivationMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Required before Export is allowed — mirrors the server-side check in
  // /api/hq/branches/[id]/agreement/export, so the button reflects reality
  // instead of only failing after the click.
  const missingRequired: string[] = []
  if (!hqLegalName.trim())     missingRequired.push('HQ Legal Name')
  if (!branchLegalName.trim()) missingRequired.push('Branch Legal Name')
  if (!effectiveDate)          missingRequired.push('Effective Date')
  if (!durationYears)          missingRequired.push('Duration (years)')

  function buildPayload() {
    return {
      hq_legal_name: hqLegalName || null,
      hq_legal_name_ar: hqLegalNameAr || null,
      hq_address: hqAddress || null,
      hq_address_ar: hqAddressAr || null,
      hq_registration: hqRegistration || null,
      hq_representative: hqRep || null,
      hq_representative_ar: hqRepAr || null,
      branch_legal_name: branchLegalName || null,
      branch_legal_name_ar: branchLegalNameAr || null,
      branch_address: branchAddress || null,
      branch_address_ar: branchAddressAr || null,
      branch_registration: branchRegistration || null,
      branch_representative: branchRep || null,
      branch_representative_ar: branchRepAr || null,
      effective_date: effectiveDate || null,
      duration_years: durationYears ? Number(durationYears) : null,
      payment_due_day: paymentDueDay ? Number(paymentDueDay) : null,
      notice_period_days: noticeDays ? Number(noticeDays) : null,
      auto_renewal: autoRenewal,
      hq_obligations: hqObligations || null,
      hq_obligations_ar: hqObligationsAr || null,
      branch_obligations: branchObligations || null,
      branch_obligations_ar: branchObligationsAr || null,
      jurisdiction: jurisdiction || null,
      jurisdiction_ar: jurisdictionAr || null,
      governing_law: governingLaw || null,
      governing_law_ar: governingLawAr || null,
      dispute_resolution: disputeRes || null,
      dispute_resolution_ar: disputeResAr || null,
      custom_clauses: customClauses || null,
      custom_clauses_ar: customClausesAr || null,
      max_units: limits.max_units,
      max_staff: limits.max_staff,
      max_tenants: limits.max_tenants,
      max_orgs: limits.max_orgs,
    }
  }

  function buildSavePayload() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { max_units, max_staff, max_tenants, max_orgs, ...rest } = buildPayload()
    return rest
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg('Saving…')
    try {
      const res = await fetch(`/api/hq/branches/${branchId}/agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSavePayload()),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaveMsg('Saved ✓')
    } catch {
      setSaveMsg('Error saving')
    } finally {
      setSaving(false)
    }
  }

  async function handleExport() {
    if (missingRequired.length > 0) {
      setSaveMsg(`Complete first: ${missingRequired.join(', ')}`)
      return
    }
    setExporting(true)
    setSaveMsg('')
    try {
      // 1 — Save draft to DB
      const saveRes = await fetch(`/api/hq/branches/${branchId}/agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSavePayload()),
      })
      if (!saveRes.ok) throw new Error('Save failed')

      // 2 — Fetch blob and trigger download (avoids browser "ask what to do" prompt)
      const exportRes = await fetch(`/api/hq/branches/${branchId}/agreement/export`)
      if (!exportRes.ok) {
        const j = await exportRes.json().catch(() => null)
        throw new Error(j?.error || 'Export failed')
      }
      const blob = await exportRes.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Branch_Agreement_${branchName.replace(/[^a-zA-Z0-9]/g, '_')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 30000)
      setExportedAt(new Date().toISOString())
      setSaveMsg('Saved ✓')
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Error saving')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/hq/branches/${branchId}/agreement/upload`, {
        method: 'POST',
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      setSignedUrl(json.url)
      setSignedName(json.name)
      setSignedAt(new Date().toISOString())
      if (json.activated) {
        setActivationMsg(
          json.invited
            ? 'Branch activated automatically — superadmin invite has been emailed.'
            : 'Branch activated automatically. No superadmin email was on file, so generate/share an invite code from the Branches list when ready.'
        )
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Agreement status
  const status = signedAt ? 'signed' : exportedAt ? 'exported' : 'draft'
  const statusConfig = {
    draft:    { label: 'Draft',    color: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Clock },
    exported: { label: 'Exported', color: 'bg-blue-50 text-blue-700 border-blue-200',    Icon: FileText },
    signed:   { label: 'Signed',   color: 'bg-green-50 text-green-700 border-green-200', Icon: CheckCircle2 },
  }[status]

  function fmtDate(iso: string | null | undefined) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
          <Link href={`/hq/branches/${branchId}`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-900 truncate">
              Branch Agreement — {branchName}
            </h1>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${statusConfig.color}`}>
            <statusConfig.Icon className="h-3.5 w-3.5" />
            {statusConfig.label}
          </div>
          {saveMsg && (
            <span className={`text-xs font-medium ${saveMsg === 'Saved ✓' ? 'text-green-600' : saveMsg === 'Saving…' ? 'text-gray-500' : 'text-red-600'}`}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: form ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Parties */}
          <div className="bg-white rounded-xl border border-gray-200 px-5">
            <SectionHeader title="1. Parties" open={openSections.parties} onToggle={() => toggle('parties')} />
            {openSections.parties && (
              <div className="pb-5 space-y-5">
                <p className="text-xs text-gray-500 -mb-1">
                  The Arabic legal name/address is the officially registered one on the Commercial Registration — not a translation of the English value.
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">HQ (Franchisor)</p>
                <BilingualField
                  enLabel="Legal Name (English)" arLabel="الاسم القانوني (عربي)"
                  enValue={hqLegalName} onEnChange={setHqLegalName}
                  arValue={hqLegalNameAr} onArChange={setHqLegalNameAr}
                  placeholder="GetSuitel Technologies LLC"
                />
                <Input label="Commercial Registration No." name="hq_registration" value={hqRegistration} onChange={setHqRegistration} placeholder="CR12345678" />
                <BilingualField
                  enLabel="Registered Address (English)" arLabel="العنوان المسجل (عربي)"
                  enValue={hqAddress} onEnChange={setHqAddress}
                  arValue={hqAddressAr} onArChange={setHqAddressAr}
                  placeholder="P.O. Box 123, Muscat, Oman"
                />
                <BilingualField
                  enLabel="Authorised Representative (English)" arLabel="الممثل المخول (عربي)"
                  enValue={hqRep} onEnChange={setHqRep}
                  arValue={hqRepAr} onArChange={setHqRepAr}
                  placeholder="Full name and title"
                />
                <Divider />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Branch (Franchisee)</p>
                <BilingualField
                  enLabel="Legal Name (English)" arLabel="الاسم القانوني (عربي)"
                  enValue={branchLegalName} onEnChange={setBranchLegalName}
                  arValue={branchLegalNameAr} onArChange={setBranchLegalNameAr}
                />
                <Input label="Commercial Registration No." name="branch_registration" value={branchRegistration} onChange={setBranchRegistration} />
                <BilingualField
                  enLabel="Registered Address (English)" arLabel="العنوان المسجل (عربي)"
                  enValue={branchAddress} onEnChange={setBranchAddress}
                  arValue={branchAddressAr} onArChange={setBranchAddressAr}
                />
                <BilingualField
                  enLabel="Authorised Representative (English)" arLabel="الممثل المخول (عربي)"
                  enValue={branchRep} onEnChange={setBranchRep}
                  arValue={branchRepAr} onArChange={setBranchRepAr}
                  placeholder="Full name and title"
                />
              </div>
            )}
          </div>

          {/* Commercial Terms */}
          <div className="bg-white rounded-xl border border-gray-200 px-5">
            <SectionHeader title="2. Commercial Terms" open={openSections.commercial} onToggle={() => toggle('commercial')} />
            {openSections.commercial && (
              <div className="pb-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Effective Date" name="effective_date" type="date" value={effectiveDate} onChange={setEffectiveDate} />
                  <Input label="Duration (years)" name="duration_years" type="number" value={durationYears} onChange={setDurationYears} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Payment Due Day (of month)" name="payment_due_day" type="number" value={paymentDueDay} onChange={setPaymentDueDay} hint="e.g. 1 = 1st of each month" />
                  <Input label="Notice Period (days)" name="notice_period_days" type="number" value={noticeDays} onChange={setNoticeDays} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={autoRenewal} onChange={e => setAutoRenewal(e.target.checked)} className="rounded border-gray-300 text-blue-600" />
                  <span className="text-sm text-gray-700">Auto-renew agreement at end of each term</span>
                </label>

                {/* Capacity limits (read-only, pulled from branch settings) */}
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Capacity Limits (set in Branch Settings)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      ['Organisations', limits.max_orgs],
                      ['Units', limits.max_units],
                      ['Staff', limits.max_staff],
                      ['Tenants', limits.max_tenants],
                    ].map(([label, val]) => (
                      <div key={String(label)} className="text-center">
                        <div className="text-lg font-bold text-gray-900">{val ?? '∞'}</div>
                        <div className="text-xs text-gray-500">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Obligations */}
          <div className="bg-white rounded-xl border border-gray-200 px-5">
            <SectionHeader title="3. Obligations" open={openSections.obligations} onToggle={() => toggle('obligations')} />
            {openSections.obligations && (
              <div className="pb-5 space-y-5">
                <p className="text-xs text-gray-500 -mt-1">
                  Legal wording — write both languages yourself (have counsel review if needed). Nothing here is auto-translated.
                </p>
                <BilingualField
                  enLabel="HQ Obligations (English)"
                  arLabel="التزامات المقر الرئيسي (عربي)"
                  enValue={hqObligations} onEnChange={setHqObligations}
                  arValue={hqObligationsAr} onArChange={setHqObligationsAr}
                  isTextarea rows={5}
                  hint="What HQ commits to provide or do for the branch."
                />
                <BilingualField
                  enLabel="Branch Obligations (English)"
                  arLabel="التزامات الفرع (عربي)"
                  enValue={branchObligations} onEnChange={setBranchObligations}
                  arValue={branchObligationsAr} onArChange={setBranchObligationsAr}
                  isTextarea rows={5}
                  hint="What the branch commits to in return."
                />
              </div>
            )}
          </div>

          {/* Governing Law */}
          <div className="bg-white rounded-xl border border-gray-200 px-5">
            <SectionHeader title="4. Governing Law" open={openSections.law} onToggle={() => toggle('law')} />
            {openSections.law && (
              <div className="pb-5 space-y-5">
                <BilingualField
                  enLabel="Jurisdiction (English)" arLabel="الاختصاص القضائي (عربي)"
                  enValue={jurisdiction} onEnChange={setJurisdiction}
                  arValue={jurisdictionAr} onArChange={setJurisdictionAr}
                />
                <BilingualField
                  enLabel="Governing Law (English)" arLabel="القانون الحاكم (عربي)"
                  enValue={governingLaw} onEnChange={setGoverningLaw}
                  arValue={governingLawAr} onArChange={setGoverningLawAr}
                />
                <BilingualField
                  enLabel="Dispute Resolution Forum (English)" arLabel="جهة تسوية النزاعات (عربي)"
                  enValue={disputeRes} onEnChange={setDisputeRes}
                  arValue={disputeResAr} onArChange={setDisputeResAr}
                />
              </div>
            )}
          </div>

          {/* Custom Clauses */}
          <div className="bg-white rounded-xl border border-gray-200 px-5">
            <SectionHeader title="5. Additional Clauses (optional)" open={openSections.custom} onToggle={() => toggle('custom')} />
            {openSections.custom && (
              <div className="pb-5">
                <BilingualField
                  enLabel="Additional Clauses (English)" arLabel="بنود إضافية (عربي)"
                  enValue={customClauses} onEnChange={setCustomClauses}
                  arValue={customClausesAr} onArChange={setCustomClausesAr}
                  isTextarea rows={6}
                  hint="Any additional terms, confidentiality, IP, or special conditions. Leave the Arabic box empty if this stays English-only — the export will note it as such."
                />
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: status & actions ──────────────────────────── */}
        <div className="space-y-4">

          {/* Status card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Agreement Status</h2>
            <ol className="space-y-4">
              {[
                { step: 'draft',    label: 'Draft',    desc: 'Fill in and save the form' },
                { step: 'exported', label: 'Exported', desc: 'Download Word doc for signing' },
                { step: 'signed',   label: 'Signed',   desc: 'Upload signed copy' },
              ].map(({ step, label, desc }) => {
                const done = status === 'signed' || (status === 'exported' && step === 'draft') || status === step
                const active = status === step
                return (
                  <li key={step} className="flex gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      {done && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${active ? 'text-blue-700' : done ? 'text-gray-900' : 'text-gray-400'}`}>{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                  </li>
                )
              })}
            </ol>

            {exportedAt && (
              <p className="mt-4 text-xs text-gray-400">Exported {fmtDate(exportedAt)}</p>
            )}
            {signedAt && (
              <p className="mt-1 text-xs text-green-600 font-medium">Signed {fmtDate(signedAt)}</p>
            )}
          </div>

          {/* Export */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Export to Word</h2>
            <p className="text-xs text-gray-500 mb-3">
              Generates a professional .docx agreement from the form. Send to both parties for review and signature.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting || missingRequired.length > 0}
              title={missingRequired.length > 0 ? `Complete first: ${missingRequired.join(', ')}` : undefined}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium py-2 rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FileDown className="h-4 w-4" />
              {exporting ? 'Saving…' : 'Export Agreement (.docx)'}
            </button>
            {missingRequired.length > 0 && (
              <p className="mt-2 text-xs text-amber-600">Complete first: {missingRequired.join(', ')}</p>
            )}
          </div>

          {/* Upload signed */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Upload Signed Copy</h2>
            {signedUrl ? (
              <div className="mb-3 flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-green-800">Signed document uploaded</p>
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-700 underline truncate block"
                  >
                    {signedName ?? 'View document'}
                  </a>
                  <p className="text-xs text-green-600 mt-0.5">{fmtDate(signedAt)}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mb-3">After both parties have signed, upload the executed agreement here.</p>
            )}

            {uploadError && (
              <div className="flex items-center gap-1.5 text-red-600 text-xs mb-2">
                <AlertCircle className="h-3.5 w-3.5" />
                {uploadError}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              onChange={handleUpload}
              className="hidden"
              id="signed-upload"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-md hover:bg-gray-50 disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading…' : signedUrl ? 'Replace Signed Copy' : 'Upload Signed Copy'}
            </button>
            <p className="mt-2 text-xs text-gray-400 text-center">PDF, DOCX, or image · max 10MB</p>
          </div>

          {/* Activation — automatic, fires the moment the signed copy is
              uploaded above. No manual button: uploading IS the activation
              event, so there's nothing left to forget to click. */}
          {signedAt && (
            <div className="rounded-xl border p-5 bg-green-50 border-green-200">
              <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-green-600" />
                Branch Activated
              </h2>
              <div className="flex items-start gap-2 text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{activationMsg ?? 'This branch activated automatically when the signed copy was uploaded.'}</span>
              </div>
            </div>
          )}

          {/* Back link */}
          <Link
            href={`/hq/branches/${branchId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Branch
          </Link>
        </div>
      </div>
    </div>
  )
}
