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
  hq_address?: string | null
  hq_registration?: string | null
  hq_representative?: string | null
  branch_legal_name?: string | null
  branch_address?: string | null
  branch_registration?: string | null
  branch_representative?: string | null
  effective_date?: string | null
  duration_years?: number | null
  payment_due_day?: number | null
  notice_period_days?: number | null
  auto_renewal?: boolean | null
  hq_obligations?: string | null
  branch_obligations?: string | null
  jurisdiction?: string | null
  governing_law?: string | null
  dispute_resolution?: string | null
  custom_clauses?: string | null
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

function Input({ label, name, value, onChange, type = 'text', placeholder, required, hint }: {
  label: string; name: string; value: string | number; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean; hint?: string
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
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function Textarea({ label, name, value, onChange, rows = 4, hint }: {
  label: string; name: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        name={name}
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
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
  const [hqAddress, setHqAddress] = useState(d?.hq_address ?? '')
  const [hqRegistration, setHqRegistration] = useState(d?.hq_registration ?? '')
  const [hqRep, setHqRep] = useState(d?.hq_representative ?? '')
  const [branchLegalName, setBranchLegalName] = useState(d?.branch_legal_name ?? branchName)
  const [branchAddress, setBranchAddress] = useState(d?.branch_address ?? [branchCity, branchCountry].filter(Boolean).join(', '))
  const [branchRegistration, setBranchRegistration] = useState(d?.branch_registration ?? '')
  const [branchRep, setBranchRep] = useState(d?.branch_representative ?? '')
  const [effectiveDate, setEffectiveDate] = useState(d?.effective_date ?? '')
  const [durationYears, setDurationYears] = useState(String(d?.duration_years ?? 1))
  const [paymentDueDay, setPaymentDueDay] = useState(String(d?.payment_due_day ?? 1))
  const [noticeDays, setNoticeDays] = useState(String(d?.notice_period_days ?? 30))
  const [autoRenewal, setAutoRenewal] = useState(d?.auto_renewal ?? true)
  const [hqObligations, setHqObligations] = useState(d?.hq_obligations ?? 'HQ shall provide the Branch with access to the GetSuitel platform, ongoing technical support, training materials, platform updates, and operational guidelines.')
  const [branchObligations, setBranchObligations] = useState(d?.branch_obligations ?? 'The Branch shall operate in accordance with HQ guidelines, maintain accurate data, pay all fees on time, protect user data in compliance with applicable laws, and report any operational issues promptly.')
  const [jurisdiction, setJurisdiction] = useState(d?.jurisdiction ?? 'Sultanate of Oman')
  const [governingLaw, setGoverningLaw] = useState(d?.governing_law ?? 'Laws of the Sultanate of Oman')
  const [disputeRes, setDisputeRes] = useState(d?.dispute_resolution ?? 'Commercial Court of Muscat')
  const [customClauses, setCustomClauses] = useState(d?.custom_clauses ?? '')

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
  const [activating, setActivating] = useState(false)
  const [activated, setActivated] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function buildPayload() {
    return {
      hq_legal_name: hqLegalName || null,
      hq_address: hqAddress || null,
      hq_registration: hqRegistration || null,
      hq_representative: hqRep || null,
      branch_legal_name: branchLegalName || null,
      branch_address: branchAddress || null,
      branch_registration: branchRegistration || null,
      branch_representative: branchRep || null,
      effective_date: effectiveDate || null,
      duration_years: durationYears ? Number(durationYears) : null,
      payment_due_day: paymentDueDay ? Number(paymentDueDay) : null,
      notice_period_days: noticeDays ? Number(noticeDays) : null,
      auto_renewal: autoRenewal,
      hq_obligations: hqObligations || null,
      branch_obligations: branchObligations || null,
      jurisdiction: jurisdiction || null,
      governing_law: governingLaw || null,
      dispute_resolution: disputeRes || null,
      custom_clauses: customClauses || null,
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
    setSaveMsg('')
    try {
      const res = await fetch(`/api/hq/branches/${branchId}/agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSavePayload()),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch {
      setSaveMsg('Error saving')
    } finally {
      setSaving(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      // Save latest form data to DB first
      const saveRes = await fetch(`/api/hq/branches/${branchId}/agreement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSavePayload()),
      })
      if (!saveRes.ok) throw new Error('Save failed before export')

      // Content-Disposition: attachment on the GET response triggers download in all browsers.
      // window.location.href is a true browser navigation — bypasses Next.js client router.
      window.location.href = `/api/hq/branches/${branchId}/agreement/export`
      setExportedAt(new Date().toISOString())
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

  async function handleActivate() {
    setActivating(true)
    try {
      const res = await fetch(`/api/hq/branches/${branchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (!res.ok) throw new Error('Failed to activate branch')
      setActivated(true)
    } finally {
      setActivating(false)
    }
  }

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
            <span className={`text-xs font-medium ${saveMsg === 'Saved' ? 'text-green-600' : 'text-red-600'}`}>
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
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">HQ (Franchisor)</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Legal Name" name="hq_legal_name" value={hqLegalName} onChange={setHqLegalName} placeholder="GetSuitel Technologies LLC" />
                  <Input label="Commercial Registration No." name="hq_registration" value={hqRegistration} onChange={setHqRegistration} placeholder="CR12345678" />
                </div>
                <Input label="Registered Address" name="hq_address" value={hqAddress} onChange={setHqAddress} placeholder="P.O. Box 123, Muscat, Oman" />
                <Input label="Authorised Representative" name="hq_representative" value={hqRep} onChange={setHqRep} placeholder="Full name and title" />
                <Divider />
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Branch (Franchisee)</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Legal Name" name="branch_legal_name" value={branchLegalName} onChange={setBranchLegalName} />
                  <Input label="Commercial Registration No." name="branch_registration" value={branchRegistration} onChange={setBranchRegistration} />
                </div>
                <Input label="Registered Address" name="branch_address" value={branchAddress} onChange={setBranchAddress} />
                <Input label="Authorised Representative" name="branch_representative" value={branchRep} onChange={setBranchRep} placeholder="Full name and title" />
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
              <div className="pb-5 space-y-4">
                <Textarea
                  label="HQ Obligations"
                  name="hq_obligations"
                  value={hqObligations}
                  onChange={setHqObligations}
                  rows={5}
                  hint="What HQ commits to provide or do for the branch."
                />
                <Textarea
                  label="Branch Obligations"
                  name="branch_obligations"
                  value={branchObligations}
                  onChange={setBranchObligations}
                  rows={5}
                  hint="What the branch commits to in return."
                />
              </div>
            )}
          </div>

          {/* Governing Law */}
          <div className="bg-white rounded-xl border border-gray-200 px-5">
            <SectionHeader title="4. Governing Law" open={openSections.law} onToggle={() => toggle('law')} />
            {openSections.law && (
              <div className="pb-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Jurisdiction" name="jurisdiction" value={jurisdiction} onChange={setJurisdiction} />
                  <Input label="Governing Law" name="governing_law" value={governingLaw} onChange={setGoverningLaw} />
                </div>
                <Input label="Dispute Resolution Forum" name="dispute_resolution" value={disputeRes} onChange={setDisputeRes} />
              </div>
            )}
          </div>

          {/* Custom Clauses */}
          <div className="bg-white rounded-xl border border-gray-200 px-5">
            <SectionHeader title="5. Additional Clauses (optional)" open={openSections.custom} onToggle={() => toggle('custom')} />
            {openSections.custom && (
              <div className="pb-5">
                <Textarea
                  label=""
                  name="custom_clauses"
                  value={customClauses}
                  onChange={setCustomClauses}
                  rows={6}
                  hint="Any additional terms, confidentiality, IP, or special conditions."
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
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium py-2 rounded-md hover:bg-blue-700 disabled:opacity-60"
            >
              <FileDown className="h-4 w-4" />
              {exporting ? 'Generating…' : 'Export Agreement (.docx)'}
            </button>
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

          {/* Activate Branch */}
          {signedAt && (
            <div className={`rounded-xl border p-5 ${activated ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Activate Branch</h2>
              {activated ? (
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Branch is now Active
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-3">
                    Agreement is signed. Mark the branch as active to allow it to start operations on the platform.
                  </p>
                  <button
                    onClick={handleActivate}
                    disabled={activating}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-medium py-2 rounded-md hover:bg-green-700 disabled:opacity-60"
                  >
                    <Zap className="h-4 w-4" />
                    {activating ? 'Activating…' : 'Activate Branch'}
                  </button>
                </>
              )}
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
