import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle,
} from 'docx'
import {
  field, fieldAr, heading, headingBi, body, bodyAr, blank,
  bilingualCard, awaitingArabicPlaceholder, untranslatedNoteAr,
  brandedHeader, brandedFooter,
} from '@/lib/docx/bilingual'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['hq_admin', 'hq_finance', 'hq_staff'].includes(profile.role)) return null
  return user
}

// ── Bilingual content ───────────────────────────────────────────────────────
// Rebuilt per HQ's request: NOT auto-translated. This is a legal document —
// HQ types both the English and Arabic wording themselves (reviewed by
// counsel if they choose), saved on the branch_agreements row (the *_ar
// columns added alongside every existing free-text field) and reused on
// every export. Structural chrome (headings, field labels like "Legal
// Name:") stays fixed bilingual copy written by the platform, since it
// carries no legal weight of its own — only the substantive clauses
// (obligations, governing law, custom clauses) are admin-authored per
// language. Layout follows the standard bilingual-contract convention: an
// English card and an Arabic card side by side per section (bilingualCard),
// not stacked EN-then-AR paragraphs.

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
            { text: 'For and on behalf of HQ:' },
            { text: 'نيابة عن المقر الرئيسي:', ar: true },
            { text: '' },
            { text: '____________________________' },
            { text: 'Authorised Signatory / التوقيع المخول' },
            { text: 'Name / الاسم: ___________________' },
            { text: 'Title / المسمى الوظيفي: ___________________' },
            { text: 'Date / التاريخ:  ___________________' },
          ]),
          cell([
            { text: 'For and on behalf of Branch:' },
            { text: 'نيابة عن الفرع:', ar: true },
            { text: '' },
            { text: '____________________________' },
            { text: 'Authorised Signatory / التوقيع المخول' },
            { text: 'Name / الاسم: ___________________' },
            { text: 'Title / المسمى الوظيفي: ___________________' },
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
  const user = await requireHQ(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load saved agreement data + branch name/capacity limits. Capacity limits
  // (max_orgs/max_units/max_staff/max_tenants) live on `branches`, not
  // `branch_agreements` — the Capacity Limits section below used to read
  // them off the agreement row, where those columns don't exist, so it
  // always fell back to "Unlimited" regardless of what was actually set.
  const [{ data: d }, { data: branch }] = await Promise.all([
    supabase.from('branch_agreements').select('*').eq('branch_id', params.id).maybeSingle(),
    supabase.from('branches').select('name, max_units, max_staff, max_tenants, max_orgs').eq('id', params.id).maybeSingle(),
  ])

  if (!d) return NextResponse.json({ error: 'No agreement found. Save the draft first.' }, { status: 404 })

  // A blank agreement used to export and mark itself "exported" with no
  // real content — the "required" red asterisks in the UI were cosmetic
  // only. Enforce the core fields server-side, not just visually.
  const missing: string[] = []
  if (!d.hq_legal_name?.trim())     missing.push('HQ Legal Name')
  if (!d.branch_legal_name?.trim()) missing.push('Branch Legal Name')
  if (!d.effective_date)            missing.push('Effective Date')
  if (!d.duration_years)            missing.push('Duration (years)')
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Complete these fields before exporting: ${missing.join(', ')}.` },
      { status: 422 },
    )
  }

  const safeBranchName = (branch?.name ?? params.id.slice(0, 8)).replace(/[^a-zA-Z0-9]/g, '_')

  const effectiveDate = d.effective_date
    ? new Date(d.effective_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '___________________'

  const years  = d.duration_years ?? 1
  const notice = d.notice_period_days ?? 30
  const jurisdiction        = d.jurisdiction || 'Sultanate of Oman'
  const jurisdictionAr      = d.jurisdiction_ar || 'سلطنة عُمان'
  const governingLaw        = d.governing_law || 'Laws of the Sultanate of Oman'
  const governingLawAr      = d.governing_law_ar || 'قوانين سلطنة عُمان'
  const disputeResolution   = d.dispute_resolution || 'Commercial Court of Muscat'
  const disputeResolutionAr = d.dispute_resolution_ar || 'المحكمة التجارية بمسقط'

  const paymentDueLabel = d.payment_due_day ? (() => {
    const n = Number(d.payment_due_day)
    const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
    return `${n}${suffix} of each month`
  })() : '___________________'
  const paymentDueLabelAr = d.payment_due_day ? `اليوم ${d.payment_due_day} من كل شهر` : '___________________'

  const termEn = `This Agreement commences on the Effective Date and remains in force for ${years} year(s)${d.auto_renewal ? ', automatically renewing for successive terms of the same duration unless either party gives written notice of non-renewal at least ' + notice + ' days before the end of any term' : ''}. Either party may terminate this Agreement by providing ${notice} days' written notice.`
  const termAr = `تبدأ هذه الاتفاقية اعتباراً من تاريخ السريان وتظل نافذة المفعول لمدة ${years} سنة (سنوات)${d.auto_renewal ? '، وتُجدَّد تلقائياً لمدد متعاقبة بذات المدة ما لم يقدم أي من الطرفين إشعاراً خطياً بعدم التجديد قبل انتهاء أي مدة بمدة لا تقل عن ' + notice + ' يوماً' : ''}. يجوز لأي من الطرفين إنهاء هذه الاتفاقية بتقديم إشعار خطي مدته ${notice} يوماً.`

  // Governing-law paragraph is built directly from the admin's own EN/AR
  // strings now — no lookup table guessing a translation for a custom value.
  const govEn = `This Agreement shall be governed by and construed in accordance with the ${governingLaw}. Any disputes arising out of or in connection with this Agreement shall be submitted to the ${disputeResolution}.`
  const govAr = `تخضع هذه الاتفاقية وتُفسَّر وفقاً لـ ${governingLawAr}. وتُحال أي نزاعات تنشأ عن هذه الاتفاقية أو تتعلق بها إلى ${disputeResolutionAr}.`

  const limitRows: [string, string, number | null | undefined][] = [
    ['Maximum Organisations', 'الحد الأقصى للمنظمات', branch?.max_orgs],
    ['Maximum Units', 'الحد الأقصى للوحدات', branch?.max_units],
    ['Maximum Staff Members', 'الحد الأقصى لأعضاء الفريق', branch?.max_staff],
    ['Maximum Tenants', 'الحد الأقصى للمستأجرين', branch?.max_tenants],
  ]

  const doc = new Document({
    title: 'Branch Franchise Agreement / اتفاقية امتياز الفرع',
    creator: 'GetSuitel Platform',
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          run: { font: 'Calibri', size: 22 },
          paragraph: { spacing: { line: 276 } },
        },
      ],
    },
    sections: [
      {
        headers: { default: brandedHeader('BRANCH FRANCHISE AGREEMENT', 'اتفاقية امتياز الفرع') },
        footers: { default: brandedFooter() },
        children: [
          // ── Cover ───────────────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 800, after: 40 },
            children: [new TextRun({ text: 'BRANCH FRANCHISE AGREEMENT', bold: true, size: 48, color: '1B3A6B' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 200 },
            children: [new TextRun({ text: 'اتفاقية امتياز الفرع', bold: true, size: 48, color: '1B3A6B', rightToLeft: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({ text: `Effective Date: ${effectiveDate}`, size: 26, italics: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 120 },
            children: [new TextRun({ text: `تاريخ السريان: ${effectiveDate}`, size: 26, italics: true, rightToLeft: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({ text: `Duration: ${years} Year(s)`, size: 22, color: '555555' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 600 },
            children: [new TextRun({ text: `المدة: ${years} سنة (سنوات)`, size: 22, color: '555555', rightToLeft: true })],
          }),

          // ── 1. Parties ────────────────────────────────────────
          ...headingBi('1. PARTIES', '1. الأطراف', HeadingLevel.HEADING_1),
          heading('1.1 HQ (Franchisor)', HeadingLevel.HEADING_3),
          bilingualCard(
            [
              field('Legal Name', d.hq_legal_name),
              field('Address', d.hq_address),
              field('Commercial Registration', d.hq_registration),
              field('Authorised Representative', d.hq_representative),
            ],
            [
              d.hq_legal_name_ar?.trim() ? fieldAr('الاسم القانوني', d.hq_legal_name_ar) : awaitingArabicPlaceholder(),
              d.hq_address_ar?.trim() ? fieldAr('العنوان', d.hq_address_ar) : awaitingArabicPlaceholder(),
              fieldAr('السجل التجاري', d.hq_registration),
              d.hq_representative_ar?.trim() ? fieldAr('الممثل المخول', d.hq_representative_ar) : awaitingArabicPlaceholder(),
            ],
          ),
          blank(),
          heading('1.2 Branch (Franchisee)', HeadingLevel.HEADING_3),
          bilingualCard(
            [
              field('Legal Name', d.branch_legal_name),
              field('Address', d.branch_address),
              field('Commercial Registration', d.branch_registration),
              field('Authorised Representative', d.branch_representative),
            ],
            [
              d.branch_legal_name_ar?.trim() ? fieldAr('الاسم القانوني', d.branch_legal_name_ar) : awaitingArabicPlaceholder(),
              d.branch_address_ar?.trim() ? fieldAr('العنوان', d.branch_address_ar) : awaitingArabicPlaceholder(),
              fieldAr('السجل التجاري', d.branch_registration),
              d.branch_representative_ar?.trim() ? fieldAr('الممثل المخول', d.branch_representative_ar) : awaitingArabicPlaceholder(),
            ],
          ),

          // ── 2. Commercial Terms ───────────────────────────────
          ...headingBi('2. COMMERCIAL TERMS', '2. الشروط التجارية', HeadingLevel.HEADING_1),
          bilingualCard(
            [
              field('Effective Date', effectiveDate),
              field('Agreement Duration', `${years} year(s)`),
              field('Payment Due Day (each month)', paymentDueLabel),
              field('Notice Period', `${notice} days`),
              field('Auto-Renewal', d.auto_renewal ? 'Yes — renews automatically unless terminated' : 'No — must be renewed manually'),
            ],
            [
              fieldAr('تاريخ السريان', effectiveDate),
              fieldAr('مدة الاتفاقية', `${years} سنة (سنوات)`),
              fieldAr('يوم استحقاق الدفع (كل شهر)', paymentDueLabelAr),
              fieldAr('فترة الإشعار', `${notice} يوماً`),
              fieldAr('التجديد التلقائي', d.auto_renewal ? 'نعم — تُجدَّد تلقائياً ما لم يتم إنهاؤها' : 'لا — يجب تجديدها يدوياً'),
            ],
          ),

          // ── 3. Capacity Limits ────────────────────────────────
          ...headingBi('3. CAPACITY LIMITS', '3. الحدود التشغيلية', HeadingLevel.HEADING_1),
          bilingualCard(
            [
              body('The following operational limits apply to this Branch:'),
              ...limitRows.map(([labelEn, , value]) => field(labelEn, value != null ? String(value) : 'Unlimited')),
            ],
            [
              bodyAr('تنطبق الحدود التشغيلية التالية على هذا الفرع:'),
              ...limitRows.map(([, labelAr, value]) => fieldAr(labelAr, value != null ? String(value) : 'غير محدود')),
            ],
          ),

          // ── 4. HQ Obligations ─────────────────────────────────
          // Admin-authored on both sides now — no auto-translation. If the
          // Arabic box was left empty, show a nudge to complete the form
          // rather than mislabeling the English text as Arabic.
          ...headingBi('4. HQ OBLIGATIONS', '4. التزامات المقر الرئيسي', HeadingLevel.HEADING_1),
          bilingualCard(
            [body(d.hq_obligations || 'HQ shall provide the Branch with access to the GetSuitel platform, technical support, training materials, and operational guidelines as agreed between the parties.')],
            [d.hq_obligations_ar?.trim() ? bodyAr(d.hq_obligations_ar) : awaitingArabicPlaceholder()],
          ),

          // ── 5. Branch Obligations ─────────────────────────────
          ...headingBi('5. BRANCH OBLIGATIONS', '5. التزامات الفرع', HeadingLevel.HEADING_1),
          bilingualCard(
            [body(d.branch_obligations || 'The Branch shall operate in accordance with HQ guidelines, maintain data accuracy, promptly pay all fees, and comply with all applicable laws and regulations.')],
            [d.branch_obligations_ar?.trim() ? bodyAr(d.branch_obligations_ar) : awaitingArabicPlaceholder()],
          ),

          // ── 6. Term & Termination ─────────────────────────────
          // Deterministic template sentence built from the same numbers on
          // both sides (not user-authored free text), so no *_ar field is
          // needed here — the two strings are already equivalent by
          // construction.
          ...headingBi('6. TERM AND TERMINATION', '6. المدة والإنهاء', HeadingLevel.HEADING_1),
          bilingualCard([body(termEn)], [bodyAr(termAr)]),

          // ── 7. Governing Law ──────────────────────────────────
          ...headingBi('7. GOVERNING LAW AND DISPUTE RESOLUTION', '7. القانون الحاكم وتسوية النزاعات', HeadingLevel.HEADING_1),
          bilingualCard(
            [
              field('Jurisdiction', jurisdiction),
              field('Governing Law', governingLaw),
              field('Dispute Resolution', disputeResolution),
              blank(),
              body(govEn),
            ],
            [
              fieldAr('الاختصاص القضائي', jurisdictionAr),
              fieldAr('القانون الحاكم', governingLawAr),
              fieldAr('تسوية النزاعات', disputeResolutionAr),
              blank(),
              bodyAr(govAr),
            ],
          ),

          // ── 8. Custom Clauses ─────────────────────────────────
          // Genuinely optional — if HQ wrote an English clause but left the
          // Arabic box blank, that's an accepted gap (untranslatedNoteAr),
          // not a "please complete the form" nudge.
          ...(d.custom_clauses
            ? [
                ...headingBi('8. ADDITIONAL CLAUSES', '8. بنود إضافية', HeadingLevel.HEADING_1),
                bilingualCard(
                  [body(d.custom_clauses)],
                  [d.custom_clauses_ar?.trim() ? bodyAr(d.custom_clauses_ar) : untranslatedNoteAr('لم تتم إضافة نسخة عربية لهذا البند.')],
                ),
              ]
            : []),

          // ── Signatures ────────────────────────────────────────
          ...headingBi(d.custom_clauses ? '9. SIGNATURES' : '8. SIGNATURES', d.custom_clauses ? '9. التوقيعات' : '8. التوقيعات', HeadingLevel.HEADING_1),
          bilingualCard(
            [body('IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date first written above.')],
            [bodyAr('وإثباتاً لما تقدم، قام الطرفان بتوقيع هذه الاتفاقية اعتباراً من تاريخ السريان المذكور أعلاه.')],
          ),
          blank(),
          signatureTable(),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)

  // Mark exported_at in DB
  await supabase
    .from('branch_agreements')
    .upsert(
      { branch_id: params.id, exported_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'branch_id' }
    )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="Branch_Agreement_${safeBranchName}.docx"`,
    },
  })
}
