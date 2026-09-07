'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Info } from 'lucide-react'

interface TemplateData {
  tenant_obligations_en?: string | null
  tenant_obligations_ar?: string | null
  landlord_obligations_en?: string | null
  landlord_obligations_ar?: string | null
  governing_law_en?: string | null
  governing_law_ar?: string | null
  notice_period_days?: number | null
  additional_clauses_en?: string | null
  additional_clauses_ar?: string | null
  updated_at?: string | null
}

// Defaults mirror the DB column defaults in
// 20260907_bilingual_agreement_templates.sql — shown here so a brand-new
// organization (no row saved yet) still sees sensible, editable starter
// wording instead of blank boxes, exactly like the HQ Branch Agreement form.
const DEFAULTS = {
  tenant_obligations_en: 'The Tenant shall pay rent on the due date each month, use the unit for residential purposes only, maintain the unit in good condition, avoid unauthorised alterations or subletting, and comply with all building rules and applicable laws.',
  tenant_obligations_ar: 'يلتزم المستأجر بسداد الإيجار في تاريخ استحقاقه من كل شهر، واستخدام الوحدة لأغراض سكنية فقط، والحفاظ عليها بحالة جيدة، وعدم إجراء أي تعديلات أو تأجير من الباطن دون إذن، والامتثال لجميع لوائح المبنى والقوانين المعمول بها.',
  landlord_obligations_en: 'The Landlord shall deliver the unit in a habitable condition, carry out structural and major maintenance not caused by tenant negligence, and respect the Tenant\'s right to quiet enjoyment of the property throughout the term.',
  landlord_obligations_ar: 'يلتزم المالك بتسليم الوحدة بحالة صالحة للسكن، والقيام بأعمال الصيانة الإنشائية والرئيسية التي لا تعود إلى إهمال المستأجر، واحترام حق المستأجر في الانتفاع الهادئ بالعقار طوال مدة العقد.',
  governing_law_en: 'This Agreement shall be governed by and construed in accordance with the Laws of the Sultanate of Oman. Any disputes arising out of or in connection with this Agreement shall be submitted to the competent courts of the Sultanate of Oman.',
  governing_law_ar: 'يخضع هذا العقد ويُفسَّر وفقاً لقوانين سلطنة عُمان. وتُحال أي نزاعات تنشأ عن هذا العقد أو تتعلق به إلى المحاكم المختصة في سلطنة عُمان.',
}

function BilingualTextarea({ enLabel, arLabel, enValue, onEnChange, arValue, onArChange, rows = 5, hint }: {
  enLabel: string; arLabel: string
  enValue: string; onEnChange: (v: string) => void
  arValue: string; onArChange: (v: string) => void
  rows?: number; hint?: string
}) {
  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{enLabel}</label>
          <textarea
            rows={rows}
            value={enValue}
            onChange={e => onEnChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{arLabel}</label>
          <textarea
            rows={rows}
            dir="rtl"
            value={arValue}
            onChange={e => onArChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

export default function TenancyTemplateClient({ initialData }: { initialData: TemplateData | null }) {
  const d = initialData

  const [tenantEn, setTenantEn] = useState(d?.tenant_obligations_en ?? DEFAULTS.tenant_obligations_en)
  const [tenantAr, setTenantAr] = useState(d?.tenant_obligations_ar ?? DEFAULTS.tenant_obligations_ar)
  const [landlordEn, setLandlordEn] = useState(d?.landlord_obligations_en ?? DEFAULTS.landlord_obligations_en)
  const [landlordAr, setLandlordAr] = useState(d?.landlord_obligations_ar ?? DEFAULTS.landlord_obligations_ar)
  const [govEn, setGovEn] = useState(d?.governing_law_en ?? DEFAULTS.governing_law_en)
  const [govAr, setGovAr] = useState(d?.governing_law_ar ?? DEFAULTS.governing_law_ar)
  const [noticeDays, setNoticeDays] = useState(String(d?.notice_period_days ?? 30))
  const [clausesEn, setClausesEn] = useState(d?.additional_clauses_en ?? '')
  const [clausesAr, setClausesAr] = useState(d?.additional_clauses_ar ?? '')

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  async function handleSave() {
    setSaving(true)
    setSaveMsg('Saving…')
    try {
      const res = await fetch('/api/owner/tenancy-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_obligations_en: tenantEn || null,
          tenant_obligations_ar: tenantAr || null,
          landlord_obligations_en: landlordEn || null,
          landlord_obligations_ar: landlordAr || null,
          governing_law_en: govEn || null,
          governing_law_ar: govAr || null,
          notice_period_days: noticeDays ? Number(noticeDays) : 30,
          additional_clauses_en: clausesEn || null,
          additional_clauses_ar: clausesAr || null,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaveMsg('Saved ✓')
    } catch {
      setSaveMsg('Error saving')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/owner/contracts" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h2 className="text-2xl font-bold text-slate-900">Tenancy Agreement Template</h2>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Reusable wording for every tenant contract you export. Update it here — future exports pick up the change automatically.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className={`text-xs font-medium ${saveMsg === 'Saved ✓' ? 'text-green-600' : saveMsg === 'Saving…' ? 'text-gray-500' : 'text-red-600'}`}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>
          This is legal content — write both languages yourself (have counsel review if you'd like). Nothing here is auto-translated.
          A contract's own Special Conditions (set per-contract on the Edit Contract form) are separate from this shared template.
        </span>
      </div>

      <div className="card p-5 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Tenant Obligations</h3>
          <BilingualTextarea
            enLabel="English" arLabel="عربي"
            enValue={tenantEn} onEnChange={setTenantEn}
            arValue={tenantAr} onArChange={setTenantAr}
          />
        </div>

        <hr className="border-gray-100" />

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Landlord Obligations</h3>
          <BilingualTextarea
            enLabel="English" arLabel="عربي"
            enValue={landlordEn} onEnChange={setLandlordEn}
            arValue={landlordAr} onArChange={setLandlordAr}
          />
        </div>

        <hr className="border-gray-100" />

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Governing Law &amp; Dispute Resolution</h3>
          <BilingualTextarea
            enLabel="English" arLabel="عربي"
            enValue={govEn} onEnChange={setGovEn}
            arValue={govAr} onArChange={setGovAr}
            rows={4}
          />
        </div>

        <hr className="border-gray-100" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Notice Period (days)</label>
          <input
            type="number"
            value={noticeDays}
            onChange={e => setNoticeDays(e.target.value)}
            className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Used in the Term &amp; Termination section of exported agreements.</p>
        </div>

        <hr className="border-gray-100" />

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Additional Clauses (optional)</h3>
          <BilingualTextarea
            enLabel="English" arLabel="عربي"
            enValue={clausesEn} onEnChange={setClausesEn}
            arValue={clausesAr} onArChange={setClausesAr}
            hint="Leave both blank to omit this section entirely. If you only fill in English, the export will note the Arabic side wasn't provided."
          />
        </div>
      </div>
    </div>
  )
}
