import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, PageNumber, Footer, Header,
} from 'docx'
import { field, fieldAr, fieldBi, headingBi, body, bodyBi, blank, untranslatedNoteAr } from '@/lib/docx/bilingual'

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

  const { data: contract } = await supabase
    .from('contracts')
    .select(`
      id, start_date, end_date, rent_amount, currency, deposit_amount, payment_day, payment_method, status, notes,
      utilities_config, organization_id,
      municipality_agreement_url, national_id_copy_url,
      tenants ( full_name, full_name_ar, email, phone, national_id, nationality ),
      units ( unit_number, properties ( name, name_ar, address, city ) )
    `)
    .eq('id', params.id)
    .maybeSingle()

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

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const startFmt = fmtDate(contract.start_date)
  const endFmt   = fmtDate(contract.end_date)

  const currency = contract.currency ?? 'OMR'
  const rentLine   = `${currency} ${Number(contract.rent_amount).toFixed(2)} per month`
  const rentLineAr = `${currency} ${Number(contract.rent_amount).toFixed(2)} شهرياً`
  const depositLine   = `${currency} ${Number(contract.deposit_amount ?? 0).toFixed(2)}`
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

  const termEn = `This Agreement commences on ${startFmt} and ends on ${endFmt}. Either party wishing not to renew must give the other at least 30 days' written notice before the end of the term. Early termination by either party requires 30 days' written notice and is subject to any deposit or notice-period terms agreed between the parties.`
  const termAr = `تبدأ هذه الاتفاقية بتاريخ ${startFmt} وتنتهي بتاريخ ${endFmt}. على الطرف الراغب في عدم التجديد إخطار الطرف الآخر كتابياً بمدة لا تقل عن 30 يوماً قبل نهاية المدة. يتطلب الإنهاء المبكر من قبل أي من الطرفين إشعاراً خطياً مدته 30 يوماً، ويخضع لأي شروط متعلقة بالتأمين أو مدة الإشعار المتفق عليها بين الطرفين.`

  const govEn = 'This Agreement shall be governed by and construed in accordance with the Laws of the Sultanate of Oman. Any disputes arising out of or in connection with this Agreement shall be submitted to the competent courts of the Sultanate of Oman.'
  const govAr = 'تخضع هذه الاتفاقية وتُفسَّر وفقاً لقوانين سلطنة عُمان. وتُحال أي نزاعات تنشأ عن هذه الاتفاقية أو تتعلق بها إلى المحاكم المختصة في سلطنة عُمان.'

  const tenantObligationsEn = 'The Tenant shall pay rent on time, use the property for residential purposes only, maintain the unit in good condition, promptly report any damage or maintenance issues, and comply with all building and community rules.'
  const tenantObligationsAr = 'يلتزم المستأجر بسداد الإيجار في موعده، واستخدام العقار لأغراض السكن فقط، والحفاظ على الوحدة بحالة جيدة، والإبلاغ الفوري عن أي أضرار أو أعطال تحتاج صيانة، والالتزام بجميع قواعد المبنى والمجتمع السكني.'

  const landlordObligationsEn = 'The Landlord shall deliver the unit in a habitable condition, carry out structural and major maintenance not caused by tenant negligence, and respect the Tenant\'s right to quiet enjoyment of the property throughout the term.'
  const landlordObligationsAr = 'يلتزم المالك بتسليم الوحدة بحالة صالحة للسكن، والقيام بأعمال الصيانة الإنشائية والرئيسية التي لا تعود إلى إهمال المستأجر، واحترام حق المستأجر في الانتفاع الهادئ بالعقار طوال مدة العقد.'

  const safeTenantName = (tenant?.full_name ?? 'Tenant').replace(/[^a-zA-Z0-9]/g, '_')

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
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: 'TENANCY AGREEMENT — عقد إيجار', italics: true, color: '888888', size: 18 })],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
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
            })],
          }),
        },
        children: [
          // ── Cover ───────────────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.CENTER, spacing: { before: 800, after: 40 },
            children: [new TextRun({ text: 'TENANCY AGREEMENT', bold: true, size: 48, color: '1a56db' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 200 },
            children: [new TextRun({ text: 'عقد إيجار', bold: true, size: 48, color: '1a56db', rightToLeft: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER, spacing: { after: 40 },
            children: [new TextRun({ text: `Term: ${startFmt} to ${endFmt}`, size: 24, italics: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 600 },
            children: [new TextRun({ text: `المدة: من ${startFmt} إلى ${endFmt}`, size: 24, italics: true, rightToLeft: true })],
          }),

          // ── 1. Parties ────────────────────────────────────────
          ...headingBi('1. PARTIES', '1. الأطراف', HeadingLevel.HEADING_1),
          ...headingBi('1.1 Landlord (Owner)', '1.1 المالك'),
          field('Legal Name', landlordName),
          fieldAr('الاسم القانوني', landlordNameAr),
          ...(isCompany ? fieldBi('Commercial Registration', 'السجل التجاري', org?.cr_number) : []),
          ...(isCompany ? fieldBi('Authorised Representative', 'الممثل المخول', landlordRep) : []),
          ...fieldBi('Phone', 'الهاتف', ownerProfile.phone),
          blank(),
          ...headingBi('1.2 Tenant', '1.2 المستأجر'),
          field('Full Name', tenant?.full_name ?? null),
          fieldAr('الاسم الكامل', tenant?.full_name_ar ?? tenant?.full_name ?? null),
          ...fieldBi('National ID', 'الرقم المدني / الهوية', tenant?.national_id),
          ...fieldBi('Nationality', 'الجنسية', tenant?.nationality),
          ...fieldBi('Phone', 'الهاتف', tenant?.phone),
          ...fieldBi('Email', 'البريد الإلكتروني', tenant?.email),

          // ── 2. Property & Unit ─────────────────────────────────
          ...headingBi('2. PROPERTY & UNIT', '2. العقار والوحدة', HeadingLevel.HEADING_1),
          field('Property', property?.name ?? null),
          fieldAr('العقار', property?.name_ar ?? property?.name ?? null),
          ...fieldBi('Address', 'العنوان', property?.address),
          ...fieldBi('City', 'المدينة', property?.city),
          ...fieldBi('Unit Number', 'رقم الوحدة', unit?.unit_number),

          // ── 3. Commercial Terms ────────────────────────────────
          ...headingBi('3. COMMERCIAL TERMS', '3. الشروط التجارية', HeadingLevel.HEADING_1),
          field('Rent', rentLine),
          fieldAr('الإيجار', rentLineAr),
          field('Payment Due Day (each month)', paymentDayLine),
          fieldAr('يوم استحقاق الدفع (كل شهر)', paymentDayLineAr),
          field('Payment Method', paymentMethodEn),
          fieldAr('طريقة الدفع', paymentMethodAr),
          ...fieldBi('Security Deposit', 'مبلغ التأمين', depositLine),
          ...fieldBi('Lease Term', 'مدة العقد', `${startFmt} — ${endFmt}`),

          // ── 4. Utilities ───────────────────────────────────────
          ...headingBi('4. UTILITIES RESPONSIBILITY', '4. مسؤولية المرافق', HeadingLevel.HEADING_1),
          ...bodyBi('Responsibility for utility payments is allocated as follows:', 'تُحدَّد مسؤولية دفع فواتير المرافق على النحو التالي:'),
          ...utilRows.flatMap(([labelEn, labelAr, party]) => {
            const [partyEn, partyAr] = UTIL_PARTY_LABEL[party] ?? UTIL_PARTY_LABEL.owner
            return [field(labelEn, partyEn), fieldAr(labelAr, partyAr)]
          }),

          // ── 5. Tenant Obligations ──────────────────────────────
          ...headingBi('5. TENANT OBLIGATIONS', '5. التزامات المستأجر', HeadingLevel.HEADING_1),
          ...bodyBi(tenantObligationsEn, tenantObligationsAr),

          // ── 6. Landlord Obligations ────────────────────────────
          ...headingBi('6. LANDLORD OBLIGATIONS', '6. التزامات المالك', HeadingLevel.HEADING_1),
          ...bodyBi(landlordObligationsEn, landlordObligationsAr),

          // ── 7. Term & Termination ──────────────────────────────
          ...headingBi('7. TERM AND TERMINATION', '7. المدة والإنهاء', HeadingLevel.HEADING_1),
          ...bodyBi(termEn, termAr),

          // ── 8. Governing Law ───────────────────────────────────
          ...headingBi('8. GOVERNING LAW AND DISPUTE RESOLUTION', '8. القانون الحاكم وتسوية النزاعات', HeadingLevel.HEADING_1),
          ...bodyBi(govEn, govAr),

          // ── 9. Special Conditions (free text, not translated) ──
          ...(contract.notes
            ? [
                ...headingBi('9. SPECIAL CONDITIONS', '9. شروط خاصة', HeadingLevel.HEADING_1),
                body(contract.notes),
                untranslatedNoteAr('ملاحظة: النص أعلاه شرط خاص أدخله المالك، ولم تتم ترجمته آلياً.'),
              ]
            : []),

          // ── 10. Attached Documents ─────────────────────────────
          ...((contract.municipality_agreement_url || contract.national_id_copy_url)
            ? [
                ...headingBi(contract.notes ? '10. ATTACHED DOCUMENTS' : '9. ATTACHED DOCUMENTS', contract.notes ? '10. المستندات المرفقة' : '9. المستندات المرفقة', HeadingLevel.HEADING_1),
                ...bodyBi(
                  'The following documents are held on file with this contract on the GetSuitel platform:' +
                  (contract.municipality_agreement_url ? ' Municipality Agreement.' : '') +
                  (contract.national_id_copy_url ? ' National ID Copy.' : ''),
                  'المستندات التالية محفوظة مع هذا العقد على منصة جيت سويتل:' +
                  (contract.municipality_agreement_url ? ' اتفاقية البلدية.' : '') +
                  (contract.national_id_copy_url ? ' نسخة من الهوية الوطنية.' : '')
                ),
              ]
            : []),

          // ── Signatures ──────────────────────────────────────────
          ...headingBi(
            contract.notes && (contract.municipality_agreement_url || contract.national_id_copy_url) ? '11. SIGNATURES'
              : contract.notes || (contract.municipality_agreement_url || contract.national_id_copy_url) ? '10. SIGNATURES'
              : '9. SIGNATURES',
            contract.notes && (contract.municipality_agreement_url || contract.national_id_copy_url) ? '11. التوقيعات'
              : contract.notes || (contract.municipality_agreement_url || contract.national_id_copy_url) ? '10. التوقيعات'
              : '9. التوقيعات',
            HeadingLevel.HEADING_1,
          ),
          ...bodyBi(
            'IN WITNESS WHEREOF, the parties have executed this Agreement as of the start date first written above.',
            'وإثباتاً لما تقدم، قام الطرفان بتوقيع هذا العقد اعتباراً من تاريخ البدء المذكور أعلاه.'
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
