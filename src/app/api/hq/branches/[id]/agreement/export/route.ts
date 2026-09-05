import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, PageNumber, Footer, Header,
} from 'docx'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['hq_admin', 'hq_finance', 'hq_staff'].includes(profile.role)) return null
  return user
}

function field(label: string, value: string | null | undefined) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: value || '___________________' }),
    ],
  })
}

function heading(text: string, level: HeadingLevel = HeadingLevel.HEADING_2) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 400, after: 120 },
    border: level === HeadingLevel.HEADING_2 ? {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '1a56db' },
    } : undefined,
  })
}

function body(text: string | null | undefined) {
  return new Paragraph({
    text: text || '',
    spacing: { after: 160 },
    style: 'Normal',
  })
}

function blank() {
  return new Paragraph({ text: '', spacing: { after: 80 } })
}

function signatureTable() {
  const cell = (lines: string[]) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      children: lines.map(l =>
        new Paragraph({
          text: l,
          spacing: { after: 60 },
          children: l === '' ? [] : undefined,
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
            'For and on behalf of HQ:',
            '',
            '',
            '____________________________',
            'Authorised Signatory',
            'Name: ___________________',
            'Title: ___________________',
            'Date:  ___________________',
          ]),
          cell([
            'For and on behalf of Branch:',
            '',
            '',
            '____________________________',
            'Authorised Signatory',
            'Name: ___________________',
            'Title: ___________________',
            'Date:  ___________________',
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

  const doc = new Document({
    title: 'Branch Franchise Agreement',
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
                  new TextRun({ text: 'BRANCH FRANCHISE AGREEMENT', italics: true, color: '888888', size: 18 }),
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
                ],
              }),
            ],
          }),
        },
        children: [
          // ── Cover ───────────────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 800, after: 200 },
            children: [new TextRun({ text: 'BRANCH FRANCHISE AGREEMENT', bold: true, size: 48, color: '1a56db' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new TextRun({ text: `Effective Date: ${effectiveDate}`, size: 26, italics: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [new TextRun({ text: `Duration: ${d.duration_years ?? 1} Year(s)`, size: 22, color: '555555' })],
          }),

          // ── 1. Parties ────────────────────────────────────────
          heading('1. PARTIES', HeadingLevel.HEADING_1),
          heading('1.1 HQ (Franchisor)'),
          field('Legal Name', d.hq_legal_name),
          field('Address', d.hq_address),
          field('Commercial Registration', d.hq_registration),
          field('Authorised Representative', d.hq_representative),
          blank(),
          heading('1.2 Branch (Franchisee)'),
          field('Legal Name', d.branch_legal_name),
          field('Address', d.branch_address),
          field('Commercial Registration', d.branch_registration),
          field('Authorised Representative', d.branch_representative),

          // ── 2. Commercial Terms ───────────────────────────────
          heading('2. COMMERCIAL TERMS', HeadingLevel.HEADING_1),
          field('Effective Date', effectiveDate),
          field('Agreement Duration', `${d.duration_years ?? 1} year(s)`),
          field('Payment Due Day (each month)', d.payment_due_day ? (() => {
            const n = Number(d.payment_due_day)
            const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
            return `${n}${suffix} of each month`
          })() : '___________________'),
          field('Notice Period', `${d.notice_period_days ?? 30} days`),
          field('Auto-Renewal', d.auto_renewal ? 'Yes — agreement renews automatically unless terminated' : 'No — must be renewed manually'),

          // ── 3. Capacity Limits ────────────────────────────────
          heading('3. CAPACITY LIMITS', HeadingLevel.HEADING_1),
          new Paragraph({
            spacing: { after: 160 },
            children: [new TextRun({ text: 'The following operational limits apply to this Branch:' })],
          }),
          ...[
            ['Maximum Organisations', branch?.max_orgs != null ? String(branch.max_orgs) : 'Unlimited'],
            ['Maximum Units', branch?.max_units != null ? String(branch.max_units) : 'Unlimited'],
            ['Maximum Staff Members', branch?.max_staff != null ? String(branch.max_staff) : 'Unlimited'],
            ['Maximum Tenants', branch?.max_tenants != null ? String(branch.max_tenants) : 'Unlimited'],
          ].map(([label, value]) =>
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({ text: `${label}: `, bold: true }),
                new TextRun({ text: value }),
              ],
            })
          ),

          // ── 4. HQ Obligations ─────────────────────────────────
          heading('4. HQ OBLIGATIONS', HeadingLevel.HEADING_1),
          body(d.hq_obligations || 'HQ shall provide the Branch with access to the GetSuitel platform, technical support, training materials, and operational guidelines as agreed between the parties.'),

          // ── 5. Branch Obligations ─────────────────────────────
          heading('5. BRANCH OBLIGATIONS', HeadingLevel.HEADING_1),
          body(d.branch_obligations || 'The Branch shall operate in accordance with HQ guidelines, maintain data accuracy, promptly pay all fees, and comply with all applicable laws and regulations.'),

          // ── 6. Term & Termination ─────────────────────────────
          heading('6. TERM AND TERMINATION', HeadingLevel.HEADING_1),
          body(`This Agreement commences on the Effective Date and remains in force for ${d.duration_years ?? 1} year(s)${d.auto_renewal ? ', automatically renewing for successive terms of the same duration unless either party gives written notice of non-renewal at least ' + (d.notice_period_days ?? 30) + ' days before the end of any term' : ''}. Either party may terminate this Agreement by providing ${d.notice_period_days ?? 30} days' written notice.`),

          // ── 7. Governing Law ──────────────────────────────────
          heading('7. GOVERNING LAW AND DISPUTE RESOLUTION', HeadingLevel.HEADING_1),
          field('Jurisdiction', d.jurisdiction || 'Sultanate of Oman'),
          field('Governing Law', d.governing_law || 'Laws of the Sultanate of Oman'),
          field('Dispute Resolution', d.dispute_resolution || 'Commercial Court of Muscat'),
          blank(),
          body(`This Agreement shall be governed by and construed in accordance with the ${d.governing_law || 'Laws of the Sultanate of Oman'}. Any disputes arising out of or in connection with this Agreement shall be submitted to the ${d.dispute_resolution || 'Commercial Court of Muscat'}.`),

          // ── 8. Custom Clauses ─────────────────────────────────
          ...(d.custom_clauses
            ? [
                heading('8. ADDITIONAL CLAUSES', HeadingLevel.HEADING_1),
                body(d.custom_clauses),
              ]
            : []),

          // ── Signatures ────────────────────────────────────────
          heading(d.custom_clauses ? '9. SIGNATURES' : '8. SIGNATURES', HeadingLevel.HEADING_1),
          body('IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date first written above.'),
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
