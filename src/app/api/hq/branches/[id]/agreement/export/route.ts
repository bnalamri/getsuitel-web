import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, PageNumber, Footer, Header,
} from 'docx'
import { field, fieldAr, fieldBi, heading, headingAr, headingBi, body, bodyBi, blank, untranslatedNoteAr } from '@/lib/docx/bilingual'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['hq_admin', 'hq_finance', 'hq_staff'].includes(profile.role)) return null
  return user
}

// ── Bilingual content ───────────────────────────────────────────────────────
// The platform is EN/AR everywhere else (mobile + web UI both ship ARB/i18n
// translations), but this generated agreement was English-only — a real gap
// flagged during HQ Dashboard testing. Paragraph-level EN/AR helpers live in
// '@/lib/docx/bilingual' (shared with the tenant agreement generator). Only
// *our own* template copy is translated — free-text values the HQ admin
// typed into the agreement form (legal names, addresses, custom clauses)
// are shown exactly as entered, since auto-translating someone else's legal
// wording would risk introducing an inaccurate translation of real contract
// terms. A small map of the handful of known default values
// (jurisdiction/governing law/dispute forum) is translated when the field
// still holds its default; anything the admin overrode is left as typed.

const AR_DEFAULTS: Record<string, string> = {
  'Sultanate of Oman': 'سلطنة عُمان',
  'Laws of the Sultanate of Oman': 'قوانين سلطنة عُمان',
  'Commercial Court of Muscat': 'المحكمة التجارية بمسقط',
}
function arValue(v: string) {
  return AR_DEFAULTS[v] ?? v
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
  const jurisdiction      = d.jurisdiction || 'Sultanate of Oman'
  const governingLaw      = d.governing_law || 'Laws of the Sultanate of Oman'
  const disputeResolution = d.dispute_resolution || 'Commercial Court of Muscat'

  const paymentDueLabel = d.payment_due_day ? (() => {
    const n = Number(d.payment_due_day)
    const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
    return `${n}${suffix} of each month`
  })() : '___________________'
  const paymentDueLabelAr = d.payment_due_day ? `اليوم ${d.payment_due_day} من كل شهر` : '___________________'

  const termEn = `This Agreement commences on the Effective Date and remains in force for ${years} year(s)${d.auto_renewal ? ', automatically renewing for successive terms of the same duration unless either party gives written notice of non-renewal at least ' + notice + ' days before the end of any term' : ''}. Either party may terminate this Agreement by providing ${notice} days' written notice.`
  const termAr = `تبدأ هذه الاتفاقية اعتباراً من تاريخ السريان وتظل نافذة المفعول لمدة ${years} سنة (سنوات)${d.auto_renewal ? '، وتُجدَّد تلقائياً لمدد متعاقبة بذات المدة ما لم يقدم أي من الطرفين إشعاراً خطياً بعدم التجديد قبل انتهاء أي مدة بمدة لا تقل عن ' + notice + ' يوماً' : ''}. يجوز لأي من الطرفين إنهاء هذه الاتفاقية بتقديم إشعار خطي مدته ${notice} يوماً.`

  const govEn = `This Agreement shall be governed by and construed in accordance with the ${governingLaw}. Any disputes arising out of or in connection with this Agreement shall be submitted to the ${disputeResolution}.`
  const govAr = `تخضع هذه الاتفاقية وتُفسَّر وفقاً لـ ${arValue(governingLaw)}. وتُحال أي نزاعات تنشأ عن هذه الاتفاقية أو تتعلق بها إلى ${arValue(disputeResolution)}.`

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
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'BRANCH FRANCHISE AGREEMENT — اتفاقية امتياز الفرع', italics: true, color: '888888', size: 18 }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Page ', size: 18, color: '888888' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' }),
                  new TextRun({ text: ' of ', size: 18, color: '888888' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '888888' }),
                  new TextRun({ text: '   |   صفحة ', size: 18, color: '888888' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' }),
                  new TextRun({ text: ' من ', size: 18, color: '888888' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '888888' }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ── Cover ───────────────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 800, after: 40 },
            children: [new TextRun({ text: 'BRANCH FRANCHISE AGREEMENT', bold: true, size: 48, color: '1a56db' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 200 },
            children: [new TextRun({ text: 'اتفاقية امتياز الفرع', bold: true, size: 48, color: '1a56db', rightToLeft: true })],
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
          ...headingBi('1.1 HQ (Franchisor)', '1.1 المقر الرئيسي (المرخِّص)'),
          ...fieldBi('Legal Name', 'الاسم القانوني', d.hq_legal_name),
          ...fieldBi('Address', 'العنوان', d.hq_address),
          ...fieldBi('Commercial Registration', 'السجل التجاري', d.hq_registration),
          ...fieldBi('Authorised Representative', 'الممثل المخول', d.hq_representative),
          blank(),
          ...headingBi('1.2 Branch (Franchisee)', '1.2 الفرع (المرخَّص له)'),
          ...fieldBi('Legal Name', 'الاسم القانوني', d.branch_legal_name),
          ...fieldBi('Address', 'العنوان', d.branch_address),
          ...fieldBi('Commercial Registration', 'السجل التجاري', d.branch_registration),
          ...fieldBi('Authorised Representative', 'الممثل المخول', d.branch_representative),

          // ── 2. Commercial Terms ───────────────────────────────
          ...headingBi('2. COMMERCIAL TERMS', '2. الشروط التجارية', HeadingLevel.HEADING_1),
          ...fieldBi('Effective Date', 'تاريخ السريان', effectiveDate),
          field('Agreement Duration', `${years} year(s)`),
          fieldAr('مدة الاتفاقية', `${years} سنة (سنوات)`),
          field('Payment Due Day (each month)', paymentDueLabel),
          fieldAr('يوم استحقاق الدفع (كل شهر)', paymentDueLabelAr),
          field('Notice Period', `${notice} days`),
          fieldAr('فترة الإشعار', `${notice} يوماً`),
          field('Auto-Renewal', d.auto_renewal ? 'Yes — agreement renews automatically unless terminated' : 'No — must be renewed manually'),
          fieldAr('التجديد التلقائي', d.auto_renewal ? 'نعم — تُجدَّد الاتفاقية تلقائياً ما لم يتم إنهاؤها' : 'لا — يجب تجديدها يدوياً'),

          // ── 3. Capacity Limits ────────────────────────────────
          ...headingBi('3. CAPACITY LIMITS', '3. الحدود التشغيلية', HeadingLevel.HEADING_1),
          ...bodyBi('The following operational limits apply to this Branch:', 'تنطبق الحدود التشغيلية التالية على هذا الفرع:'),
          ...([
            ['Maximum Organisations', 'الحد الأقصى للمنظمات', branch?.max_orgs != null ? String(branch.max_orgs) : null],
            ['Maximum Units', 'الحد الأقصى للوحدات', branch?.max_units != null ? String(branch.max_units) : null],
            ['Maximum Staff Members', 'الحد الأقصى لأعضاء الفريق', branch?.max_staff != null ? String(branch.max_staff) : null],
            ['Maximum Tenants', 'الحد الأقصى للمستأجرين', branch?.max_tenants != null ? String(branch.max_tenants) : null],
          ] as [string, string, string | null][]).flatMap(([labelEn, labelAr, value]) => [
            new Paragraph({
              spacing: { after: 20 },
              children: [
                new TextRun({ text: `${labelEn}: `, bold: true }),
                new TextRun({ text: value ?? 'Unlimited' }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { after: 100 },
              children: [
                new TextRun({ text: `${labelAr}: `, bold: true, rightToLeft: true }),
                new TextRun({ text: value ?? 'غير محدود', rightToLeft: true }),
              ],
            }),
          ]),

          // ── 4. HQ Obligations ─────────────────────────────────
          ...headingBi('4. HQ OBLIGATIONS', '4. التزامات المقر الرئيسي', HeadingLevel.HEADING_1),
          ...bodyBi(
            d.hq_obligations || 'HQ shall provide the Branch with access to the GetSuitel platform, technical support, training materials, and operational guidelines as agreed between the parties.',
            d.hq_obligations
              ? d.hq_obligations
              : 'يلتزم المقر الرئيسي بتزويد الفرع بإمكانية الوصول إلى منصة جيت سويتل، والدعم الفني، والمواد التدريبية، والإرشادات التشغيلية وفق ما يتفق عليه الطرفان.'
          ),
          ...(d.hq_obligations ? [untranslatedNoteAr('(بند مخصص أدخله المقر الرئيسي — بالنص الأصلي أعلاه، لم تتم ترجمته آلياً)')] : []),

          // ── 5. Branch Obligations ─────────────────────────────
          ...headingBi('5. BRANCH OBLIGATIONS', '5. التزامات الفرع', HeadingLevel.HEADING_1),
          ...bodyBi(
            d.branch_obligations || 'The Branch shall operate in accordance with HQ guidelines, maintain data accuracy, promptly pay all fees, and comply with all applicable laws and regulations.',
            d.branch_obligations
              ? d.branch_obligations
              : 'يلتزم الفرع بالعمل وفقاً لإرشادات المقر الرئيسي، والحفاظ على دقة البيانات، وسداد جميع الرسوم في مواعيدها، والامتثال لجميع القوانين والأنظمة المعمول بها.'
          ),
          ...(d.branch_obligations ? [untranslatedNoteAr('(بند مخصص أدخله المقر الرئيسي — بالنص الأصلي أعلاه، لم تتم ترجمته آلياً)')] : []),

          // ── 6. Term & Termination ─────────────────────────────
          ...headingBi('6. TERM AND TERMINATION', '6. المدة والإنهاء', HeadingLevel.HEADING_1),
          ...bodyBi(termEn, termAr),

          // ── 7. Governing Law ──────────────────────────────────
          ...headingBi('7. GOVERNING LAW AND DISPUTE RESOLUTION', '7. القانون الحاكم وتسوية النزاعات', HeadingLevel.HEADING_1),
          ...fieldBi('Jurisdiction', 'الاختصاص القضائي', jurisdiction),
          ...fieldBi('Governing Law', 'القانون الحاكم', governingLaw),
          ...fieldBi('Dispute Resolution', 'تسوية النزاعات', disputeResolution),
          blank(),
          ...bodyBi(govEn, govAr),

          // ── 8. Custom Clauses ─────────────────────────────────
          ...(d.custom_clauses
            ? [
                ...headingBi('8. ADDITIONAL CLAUSES', '8. بنود إضافية', HeadingLevel.HEADING_1),
                body(d.custom_clauses),
                untranslatedNoteAr('ملاحظة: النص أعلاه بند إضافي أدخله المقر الرئيسي، ولم تتم ترجمته آلياً.'),
              ]
            : []),

          // ── Signatures ────────────────────────────────────────
          ...headingBi(d.custom_clauses ? '9. SIGNATURES' : '8. SIGNATURES', d.custom_clauses ? '9. التوقيعات' : '8. التوقيعات', HeadingLevel.HEADING_1),
          ...bodyBi(
            'IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date first written above.',
            'وإثباتاً لما تقدم، قام الطرفان بتوقيع هذه الاتفاقية اعتباراً من تاريخ السريان المذكور أعلاه.'
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
