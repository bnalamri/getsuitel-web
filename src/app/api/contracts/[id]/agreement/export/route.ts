import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle,
} from 'docx'
import {
  field, fieldAr, headingBi, body, bodyAr, blank,
  bilingualCard, awaitingArabicPlaceholder, untranslatedNoteAr,
  brandedHeader, brandedFooter, dualDate,
} from '@/lib/docx/bilingual'

// Owner-side only (owner / property_manager) — this generates the tenancy
// contract between an owner's organisation and one of their tenants. It is
// not reachable from HQ or any admin-level role; that's a separate document
// (the Branch Franchise Agreement) between GetSuitel HQ and a branch.
async function requireOwner(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles')
    .select('role, organization_id, full_name, full_name_ar, phone, email, national_id')
    .eq('id', user.id).single()
  if (!profile || !['owner', 'property_manager'].includes(profile.role) || !profile.organization_id) return null
  return profile
}

const PAYMENT_METHOD_LABEL: Record<string, [string, string]> = {
  cash:           ['Cash', 'نقداً'],
  cheque:         ['Cheque', 'شيك'],
  bank_transfer:  ['Bank Transfer', 'تحويل بنكي'],
  mobile_wallet:  ['Mobile Wallet', 'محفظة إلكترونية'],
}
const UTIL_PARTY_LABEL: Record<string, [string, string]> = {
  owner:  ['Owner', 'المالك'],
  tenant: ['Tenant', 'المستأجر'],
}

// Platform-authored fallback wording, used only if the organization has
// never saved a Tenancy Agreement Template (Settings → Contracts →
// Agreement Template). Identical to that form's own defaults and the DB
// column defaults in 20260907_bilingual_agreement_templates.sql, so a
// brand-new org gets sensible bilingual text on its very first export.
const TEMPLATE_DEFAULTS = {
  tenant_obligations_en: 'The Tenant shall pay rent on the due date each month, use the unit for residential purposes only, maintain the unit in good condition, avoid unauthorised alterations or subletting, and comply with all building rules and applicable laws.',
  tenant_obligations_ar: 'يلتزم المستأجر بسداد الإيجار في تاريخ استحقاقه من كل شهر، واستخدام الوحدة لأغراض سكنية فقط، والحفاظ عليها بحالة جيدة، وعدم إجراء أي تعديلات أو تأجير من الباطن دون إذن، والامتثال لجميع لوائح المبنى والقوانين المعمول بها.',
  landlord_obligations_en: 'The Landlord shall deliver the unit in a habitable condition, carry out structural and major maintenance not caused by tenant negligence, and respect the Tenant\'s right to quiet enjoyment of the property throughout the term.',
  landlord_obligations_ar: 'يلتزم المالك بتسليم الوحدة بحالة صالحة للسكن، والقيام بأعمال الصيانة الإنشائية والرئيسية التي لا تعود إلى إهمال المستأجر، واحترام حق المستأجر في الانتفاع الهادئ بالعقار طوال مدة العقد.',
  governing_law_en: 'This Agreement shall be governed by and construed in accordance with the Laws of the Sultanate of Oman. Any disputes arising out of or in connection with this Agreement shall be submitted to the competent courts of the Sultanate of Oman.',
  governing_law_ar: 'يخضع هذا العقد ويُفسَّر وفقاً لقوانين سلطنة عُمان. وتُحال أي نزاعات تنشأ عن هذا العقد أو تتعلق به إلى المحاكم المختصة في سلطنة عُمان.',
  notice_period_days: 30,
}

function signatureTable() {
  const cell = (lines: { text: string; ar?: boolean }[]) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      children: lines.map(l =>
        new Paragraph({
          alignment: l.ar ? AlignmentType.RIGHT : undefined,
          bidirectional: l.ar,
          spacing: { after: 60 },
          children: l.text === '' ? [] : [new TextRun({ text: l.text, rightToLeft: l.ar })],
        })
      ),
    })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE } },
    rows: [
      new TableRow({
        children: [
          cell([
            { text: 'For and on behalf of the Landlord:' },
            { text: 'نيابة عن المالك:', ar: true },
            { text: '' },
            { text: '____________________________' },
            { text: 'Signature / التوقيع' },
            { text: 'Name / الاسم: ___________________' },
            { text: 'Date / التاريخ:  ___________________' },
          ]),
          cell([
            { text: 'Tenant:' },
            { text: 'المستأجر:', ar: true },
            { text: '' },
            { text: '____________________________' },
            { text: 'Signature / التوقيع' },
            { text: 'Name / الاسم: ___________________' },
            { text: 'Date / التاريخ:  ___________________' },
          ]),
        ],
      }),
    ],
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const ownerProfile = await requireOwner(supabase)
  if (!ownerProfile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: contract }, { data: tpl }] = await Promise.all([
    supabase
      .from('contracts')
      .select(`
        id, start_date, end_date, rent_amount, currency, deposit_amount, payment_day, payment_method, status, notes, notes_ar,
        utilities_config, organization_id,
        municipality_agreement_url, national_id_copy_url,
        tenants ( full_name, full_name_ar, email, phone, national_id, nationality ),
        units ( unit_number, properties ( name, name_ar, address, city ) )
      `)
      .eq('id', params.id)
      .maybeSingle(),
    supabase
      .from('tenancy_agreement_templates')
      .select('*')
      .eq('organization_id', ownerProfile.organization_id)
      .maybeSingle(),
  ])

  if (!contract || contract.organization_id !== ownerProfile.organization_id) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  const missing: string[] = []
  if (!contract.start_date)  missing.push('Start Date')
  if (!contract.end_date)    missing.push('End Date')
  if (!contract.rent_amount) missing.push('Rent Amount')
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Complete these fields before exporting: ${missing.join(', ')}.` },
      { status: 422 },
    )
  }

  // Reusable EN/AR legal wording — from the organization's own Tenancy
  // Agreement Template (Contracts → Agreement Template), authored by the
  // owner, never auto-translated. Falls back to platform defaults only if
  // the org has never saved a template.
  const t = {
    tenantObligationsEn: tpl?.tenant_obligations_en || TEMPLATE_DEFAULTS.tenant_obligations_en,
    tenantObligationsAr: tpl?.tenant_obligations_ar || TEMPLATE_DEFAULTS.tenant_obligations_ar,
    landlordObligationsEn: tpl?.landlord_obligations_en || TEMPLATE_DEFAULTS.landlord_obligations_en,
    landlordObligationsAr: tpl?.landlord_obligations_ar || TEMPLATE_DEFAULTS.landlord_obligations_ar,
    governingLawEn: tpl?.governing_law_en || TEMPLATE_DEFAULTS.governing_law_en,
    governingLawAr: tpl?.governing_law_ar || TEMPLATE_DEFAULTS.governing_law_ar,
    noticeDays: tpl?.notice_period_days ?? TEMPLATE_DEFAULTS.notice_period_days,
    clausesEn: tpl?.additional_clauses_en || null,
    clausesAr: tpl?.additional_clauses_ar || null,
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name, name_ar, owner_type, cr_number, authorized_rep, owner_id')
    .eq('id', ownerProfile.organization_id)
    .maybeSingle()

  // Landlord legal name: the org's registered name for a company, otherwise
  // the individual owner's own name — mirrors how AddContractForm/register
  // already distinguish owner_type across the rest of the app.
  const isCompany = org?.owner_type === 'company'
  const landlordName   = isCompany ? (org?.name ?? ownerProfile.full_name) : ownerProfile.full_name
  const landlordNameAr = isCompany ? (org?.name_ar ?? landlordName) : (ownerProfile.full_name_ar ?? landlordName)
  const landlordRep    = isCompany ? (org?.authorized_rep || ownerProfile.full_name) : null

  const tenant = contract.tenants as unknown as { full_name: string; full_name_ar: string | null; email: string; phone: string; national_id: string | null; nationality: string | null } | null
  const unit   = contract.units as unknown as { unit_number: string; properties: { name: string; name_ar: string | null; address: string; city: string } | null } | null
  const property = unit?.properties ?? null

  // Dual-calendar: Gregorian + Hijri (Umm al-Qura), the convention on
  // official Omani/GCC documents. Also fixes the Arabic side previously
  // reusing the English-formatted string verbatim (English month name
  // inside Arabic text).
  const startEnFmt = dualDate(contract.start_date, 'en')
  const startArFmt = dualDate(contract.start_date, 'ar')
  const endEnFmt   = dualDate(contract.end_date, 'en')
  const endArFmt   = dualDate(contract.end_date, 'ar')

  const currency = contract.currency ?? 'OMR'
  const rentLine   = `${currency} ${Number(contract.rent_amount).toFixed(2)} per month`
  const rentLineAr = `${currency} ${Number(contract.rent_amount).toFixed(2)} شهرياً`
  const depositLine = `${currency} ${Number(contract.deposit_amount ?? 0).toFixed(2)}`
  const paymentDay = Number(contract.payment_day ?? 1)
  const paymentDaySuffix = paymentDay === 1 ? 'st' : paymentDay === 2 ? 'nd' : paymentDay === 3 ? 'rd' : 'th'
  const paymentDayLine   = `${paymentDay}${paymentDaySuffix} of each month`
  const paymentDayLineAr = `اليوم ${paymentDay} من كل شهر`
  const [paymentMethodEn, paymentMethodAr] = PAYMENT_METHOD_LABEL[contract.payment_method ?? 'cash'] ?? PAYMENT_METHOD_LABEL.cash

  const utilCfg = (contract.utilities_config as { water?: string; electricity?: string; internet?: string } | null) ?? {}
  const utilRows: [string, string, string][] = [
    ['Water', 'الماء', utilCfg.water ?? 'owner'],
    ['Electricity', 'الكهرباء', utilCfg.electricity ?? 'owner'],
    ['Internet', 'الإنترنت', utilCfg.internet ?? 'owner'],
  ]

  const termEn = `This Agreement commences on ${startEnFmt} and ends on ${endEnFmt}. Either party wishing not to renew must give the other at least ${t.noticeDays} days' written notice before the end of the term. Early termination by either party requires ${t.noticeDays} days' written notice and is subject to any deposit or notice-period terms agreed between the parties.`
  const termAr = `تبدأ هذه الاتفاقية بتاريخ ${startArFmt} وتنتهي بتاريخ ${endArFmt}. على الطرف الراغب في عدم التجديد إخطار الطرف الآخر كتابياً بمدة لا تقل عن ${t.noticeDays} يوماً قبل نهاية المدة. يتطلب الإنهاء المبكر من قبل أي من الطرفين إشعاراً خطياً مدته ${t.noticeDays} يوماً، ويخضع لأي شروط متعلقة بالتأمين أو مدة الإشعار المتفق عليها بين الطرفين.`

  const safeTenantName = (tenant?.full_name ?? 'Tenant').replace(/[^a-zA-Z0-9]/g, '_')

  // Section numbering shifts depending on which optional sections render —
  // computed once so headings and the Signatures section stay in sync.
  const hasSpecialConditions = !!contract.notes
  const hasAdditionalClauses = !!t.clausesEn
  const hasAttachments = !!(contract.municipality_agreement_url || contract.national_id_copy_url)
  let n = 8
  const specialConditionsNum = hasSpecialConditions ? ++n : null
  const additionalClausesNum = hasAdditionalClauses ? ++n : null
  const attachmentsNum = hasAttachments ? ++n : null
  const signaturesNum = ++n

  const doc = new Document({
    title: 'Tenancy Agreement / عقد إيجار',
    creator: 'GetSuitel Platform',
    styles: {
      paragraphStyles: [
        { id: 'Normal', name: 'Normal', run: { font: 'Calibri', size: 22 }, paragraph: { spacing: { line: 276 } } },
      ],
    },
    sections: [
      {
        headers: { default: brandedHeader('TENANCY AGREEMENT', 'عقد إيجار') },
        footers: { default: brandedFooter() },
        children: [
          // ── Cover ───────────────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.CENTER, spacing: { before: 800, after: 40 },
            children: [new TextRun({ text: 'TENANCY AGREEMENT', bold: true, size: 48, color: '1B3A6B' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 200 },
            children: [new TextRun({ text: 'عقد إيجار', bold: true, size: 48, color: '1B3A6B', rightToLeft: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER, spacing: { after: 40 },
            children: [new TextRun({ text: `Term: ${startEnFmt} to ${endEnFmt}`, size: 24, italics: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 600 },
            children: [new TextRun({ text: `المدة: من ${startArFmt} إلى ${endArFmt}`, size: 24, italics: true, rightToLeft: true })],
          }),

          // ── 1. Parties ────────────────────────────────────────
          ...headingBi('1. PARTIES', '1. الأطراف', HeadingLevel.HEADING_1),
          bilingualCard(
            [
              field('Legal Name', landlordName),
              ...(isCompany ? [field('Commercial Registration', org?.cr_number)] : []),
              ...(isCompany ? [field('Authorised Representative', landlordRep)] : []),
              field('Phone', ownerProfile.phone),
            ],
            [
              fieldAr('الاسم القانوني', landlordNameAr),
              ...(isCompany ? [fieldAr('السجل التجاري', org?.cr_number)] : []),
              ...(isCompany ? [fieldAr('الممثل المخول', landlordRep)] : []),
              fieldAr('الهاتف', ownerProfile.phone),
            ],
          ),
          blank(),
          bilingualCard(
            [
              field('Full Name', tenant?.full_name ?? null),
              field('National ID', tenant?.national_id ?? null),
              field('Nationality', tenant?.nationality ?? null),
              field('Phone', tenant?.phone ?? null),
              field('Email', tenant?.email ?? null),
            ],
            [
              fieldAr('الاسم الكامل', tenant?.full_name_ar ?? tenant?.full_name ?? null),
              fieldAr('الرقم المدني / الهوية', tenant?.national_id ?? null),
              fieldAr('الجنسية', tenant?.nationality ?? null),
              fieldAr('الهاتف', tenant?.phone ?? null),
              fieldAr('البريد الإلكتروني', tenant?.email ?? null),
            ],
          ),

          // ── 2. Property & Unit ─────────────────────────────────
          ...headingBi('2. PROPERTY & UNIT', '2. العقار والوحدة', HeadingLevel.HEADING_1),
          bilingualCard(
            [
              field('Property', property?.name ?? null),
              field('Address', property?.address ?? null),
              field('City', property?.city ?? null),
              field('Unit Number', unit?.unit_number ?? null),
            ],
            [
              fieldAr('العقار', property?.name_ar ?? property?.name ?? null),
              fieldAr('العنوان', property?.address ?? null),
              fieldAr('المدينة', property?.city ?? null),
              fieldAr('رقم الوحدة', unit?.unit_number ?? null),
            ],
          ),

          // ── 3. Commercial Terms ────────────────────────────────
          ...headingBi('3. COMMERCIAL TERMS', '3. الشروط التجارية', HeadingLevel.HEADING_1),
          bilingualCard(
            [
              field('Rent', rentLine),
              field('Payment Due Day (each month)', paymentDayLine),
              field('Payment Method', paymentMethodEn),
              field('Security Deposit', depositLine),
              field('Lease Term', `${startEnFmt} — ${endEnFmt}`),
            ],
            [
              fieldAr('الإيجار', rentLineAr),
              fieldAr('يوم استحقاق الدفع (كل شهر)', paymentDayLineAr),
              fieldAr('طريقة الدفع', paymentMethodAr),
              fieldAr('مبلغ التأمين', depositLine),
              fieldAr('مدة العقد', `${startArFmt} — ${endArFmt}`),
            ],
          ),

          // ── 4. Utilities ───────────────────────────────────────
          ...headingBi('4. UTILITIES RESPONSIBILITY', '4. مسؤولية المرافق', HeadingLevel.HEADING_1),
          bilingualCard(
            [
              body('Responsibility for utility payments is allocated as follows:'),
              ...utilRows.map(([labelEn, , party]) => field(labelEn, (UTIL_PARTY_LABEL[party] ?? UTIL_PARTY_LABEL.owner)[0])),
            ],
            [
              bodyAr('تُحدَّد مسؤولية دفع فواتير المرافق على النحو التالي:'),
              ...utilRows.map(([, labelAr, party]) => fieldAr(labelAr, (UTIL_PARTY_LABEL[party] ?? UTIL_PARTY_LABEL.owner)[1])),
            ],
          ),

          // ── 5. Tenant Obligations ──────────────────────────────
          // Pulled from the org's Tenancy Agreement Template — owner-authored
          // on both sides, never auto-translated.
          ...headingBi('5. TENANT OBLIGATIONS', '5. التزامات المستأجر', HeadingLevel.HEADING_1),
          bilingualCard([body(t.tenantObligationsEn)], [bodyAr(t.tenantObligationsAr)]),

          // ── 6. Landlord Obligations ────────────────────────────
          ...headingBi('6. LANDLORD OBLIGATIONS', '6. التزامات المالك', HeadingLevel.HEADING_1),
          bilingualCard([body(t.landlordObligationsEn)], [bodyAr(t.landlordObligationsAr)]),

          // ── 7. Term & Termination ──────────────────────────────
          ...headingBi('7. TERM AND TERMINATION', '7. المدة والإنهاء', HeadingLevel.HEADING_1),
          bilingualCard([body(termEn)], [bodyAr(termAr)]),

          // ── 8. Governing Law ───────────────────────────────────
          ...headingBi('8. GOVERNING LAW AND DISPUTE RESOLUTION', '8. القانون الحاكم وتسوية النزاعات', HeadingLevel.HEADING_1),
          bilingualCard([body(t.governingLawEn)], [bodyAr(t.governingLawAr)]),

          // ── Special Conditions (per-contract, owner-authored) ───
          ...(hasSpecialConditions
            ? [
                ...headingBi(`${specialConditionsNum}. SPECIAL CONDITIONS`, `${specialConditionsNum}. شروط خاصة`, HeadingLevel.HEADING_1),
                bilingualCard(
                  [body(contract.notes)],
                  [contract.notes_ar?.trim() ? bodyAr(contract.notes_ar) : awaitingArabicPlaceholder()],
                ),
              ]
            : []),

          // ── Additional Clauses (from the org template, optional) ─
          ...(hasAdditionalClauses
            ? [
                ...headingBi(`${additionalClausesNum}. ADDITIONAL CLAUSES`, `${additionalClausesNum}. بنود إضافية`, HeadingLevel.HEADING_1),
                bilingualCard(
                  [body(t.clausesEn)],
                  [t.clausesAr?.trim() ? bodyAr(t.clausesAr) : untranslatedNoteAr('لم تتم إضافة نسخة عربية لهذا البند.')],
                ),
              ]
            : []),

          // ── Attached Documents ───────────────────────────────────
          ...(hasAttachments
            ? [
                ...headingBi(`${attachmentsNum}. ATTACHED DOCUMENTS`, `${attachmentsNum}. المستندات المرفقة`, HeadingLevel.HEADING_1),
                ...(() => {
                  const enParts = ['The following documents are held on file with this contract on the GetSuitel platform:']
                  const arParts = ['المستندات التالية محفوظة مع هذا العقد على منصة جيت سويتل:']
                  if (contract.municipality_agreement_url) { enParts.push(' Municipality Agreement.'); arParts.push(' اتفاقية البلدية.') }
                  if (contract.national_id_copy_url)       { enParts.push(' National ID Copy.');       arParts.push(' نسخة من الهوية الوطنية.') }
                  return [body(enParts.join('')), bodyAr(arParts.join(''))]
                })(),
              ]
            : []),

          // ── Signatures ──────────────────────────────────────────
          ...headingBi(`${signaturesNum}. SIGNATURES`, `${signaturesNum}. التوقيعات`, HeadingLevel.HEADING_1),
          bilingualCard(
            [body('IN WITNESS WHEREOF, the parties have executed this Agreement as of the start date first written above.')],
            [bodyAr('وإثباتاً لما تقدم، قام الطرفان بتوقيع هذا العقد اعتباراً من تاريخ البدء المذكور أعلاه.')],
          ),
          blank(),
          signatureTable(),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="Tenancy_Agreement_${safeTenantName}.docx"`,
    },
  })
}
