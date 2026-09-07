// Shared EN/AR paragraph helpers for generated .docx legal documents
// (HQ Branch Franchise Agreement, Tenant Agreement). Each "Bi" helper
// renders an English block immediately followed by its Arabic mirror
// (right-aligned, `bidirectional: true` on the paragraph + `rightToLeft: true`
// on the run, so Word lays the Arabic out RTL). Extracted here so both
// generators stay visually and structurally consistent instead of
// duplicating the same ~150 lines.
import {
  Paragraph, TextRun, HeadingLevel, BorderStyle, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType,
  Header, Footer, PageNumber,
} from 'docx'

// GetSuitel navy — matches the print-header band used everywhere else in
// the platform (src/components/PrintHeader.tsx), so a signed agreement and
// a printed report carry the same brand color.
const BRAND_NAVY = '1B3A6B'

export function field(label: string, value: string | null | undefined) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: value || '___________________' }),
    ],
  })
}

export function fieldAr(labelAr: string, value: string | null | undefined) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `${labelAr}: `, bold: true, rightToLeft: true }),
      new TextRun({ text: value || '___________________', rightToLeft: true }),
    ],
  })
}

export function fieldBi(labelEn: string, labelAr: string, value: string | null | undefined) {
  return [field(labelEn, value), fieldAr(labelAr, value)]
}

export function heading(text: string, level: HeadingLevel = HeadingLevel.HEADING_2) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 400, after: 60 },
    // keepNext / keepLines: without these, Word is free to break the page
    // right after a heading, stranding it alone at the bottom with its
    // content (the AR heading below it, or the bilingualCard table) pushed
    // to the next page — seen in the first real export.
    keepNext: true,
    keepLines: true,
    border: level === HeadingLevel.HEADING_2 ? {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '1a56db' },
    } : undefined,
  })
}

export function headingAr(textAr: string) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { after: 160 },
    keepNext: true,
    keepLines: true,
    children: [new TextRun({ text: textAr, bold: true, size: 24, color: '1a56db', rightToLeft: true })],
  })
}

export function headingBi(textEn: string, textAr: string, level: HeadingLevel = HeadingLevel.HEADING_2) {
  return [heading(textEn, level), headingAr(textAr)]
}

export function body(text: string | null | undefined) {
  return new Paragraph({
    text: text || '',
    spacing: { after: 80 },
    style: 'Normal',
  })
}

export function bodyAr(textAr: string) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { after: 160 },
    children: [new TextRun({ text: textAr, rightToLeft: true })],
  })
}

export function bodyBi(textEn: string | null | undefined, textAr: string) {
  return [body(textEn), bodyAr(textAr)]
}

export function blank() {
  return new Paragraph({ text: '', spacing: { after: 80 } })
}

// Small note shown when an OPTIONAL free-text field (e.g. additional
// clauses) has an English value but no Arabic counterpart was entered.
// This is a deliberate gap the admin can leave, not an error — the
// document still ships, just flags that section as English-only.
export function untranslatedNoteAr(noteAr: string) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { after: 160 },
    children: [new TextRun({ text: noteAr, italics: true, size: 18, color: '888888', rightToLeft: true })],
  })
}

// Placeholder shown in the Arabic card of a bilingualCard() when a
// required-in-practice field's Arabic version hasn't been filled in yet on
// the template/agreement form. Distinct from untranslatedNoteAr — this is a
// nudge to go complete the form, not a note about an accepted gap.
export function awaitingArabicPlaceholder() {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { after: 120 },
    children: [new TextRun({
      text: 'لم يُدخل النص العربي لهذا البند بعد — يرجى إكماله في نموذج التحرير.',
      italics: true, size: 18, color: '999999', rightToLeft: true,
    })],
  })
}

// ── Side-by-side EN | AR "card" layout ──────────────────────────────────
// The standard convention for bilingual GCC contracts: one English column
// and one Arabic column, side by side, per section — not stacked EN-then-AR
// paragraphs. Assumes the default A4 page (11906 dxa) with docx.js's
// default 1" margins (1440 dxa each side), giving ~9026 dxa of usable width.
const CONTENT_WIDTH_DXA = 9026
const CARD_GAP_DXA = 200
const CARD_WIDTH_DXA = Math.floor((CONTENT_WIDTH_DXA - CARD_GAP_DXA) / 2)

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as const

function cardCell(children: Paragraph[]) {
  return new TableCell({
    width: { size: CARD_WIDTH_DXA, type: WidthType.DXA },
    margins: { top: 160, bottom: 160, left: 200, right: 200 },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F7F9FC' },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'DCE3EE' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DCE3EE' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'DCE3EE' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'DCE3EE' },
    },
    children: children.length > 0 ? children : [new Paragraph({ text: '' })],
  })
}

function gapCell() {
  return new TableCell({
    width: { size: CARD_GAP_DXA, type: WidthType.DXA },
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
    children: [new Paragraph({ text: '' })],
  })
}

// enChildren/arChildren are the paragraphs for that section's body ONLY
// (field()/body() calls for the English card, fieldAr()/bodyAr() for the
// Arabic card) — put the shared section heading above this via headingBi(),
// spanning the full page width, not inside either card.
// ── Dual-calendar dates ─────────────────────────────────────────────────
// Official Omani/GCC documents customarily show both the Gregorian and
// Hijri (Umm al-Qura) date. Node's built-in ICU supports the Islamic
// calendar natively via Intl — no extra library needed. Western (Latin)
// digits are used throughout, matching how every other number already
// renders in these documents (e.g. "30 يوماً", not Eastern Arabic numerals).
// Also fixes a latent bug: the Arabic side of a date used to reuse the
// English-formatted string verbatim (English month name inside Arabic
// text) — this gives it a real Arabic-locale Gregorian rendering too.
export function dualDate(iso: string | null | undefined, lang: 'en' | 'ar'): string {
  if (!iso) return '___________________'
  const d = new Date(iso)
  if (lang === 'en') {
    const gregorian = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
    return `${gregorian} (${hijri})`
  }
  const gregorian = new Intl.DateTimeFormat('ar-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
  const hijri = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
  return `${gregorian} (${hijri})`
}

export function bilingualCard(enChildren: Paragraph[], arChildren: Paragraph[]) {
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [CARD_WIDTH_DXA, CARD_GAP_DXA, CARD_WIDTH_DXA],
    borders: {
      top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
      insideHorizontal: noBorder, insideVertical: noBorder,
    },
    rows: [
      new TableRow({ children: [cardCell(enChildren), gapCell(), cardCell(arChildren)] }),
    ],
  })
}

// ── Branded header / footer ─────────────────────────────────────────────
// Shared by both the HQ Franchise Agreement and Tenancy Agreement exports
// so every legal document generated by the platform carries the same navy
// GetSuitel band and page-numbering footer.
export function brandedHeader(titleEn: string, titleAr: string) {
  return new Header({
    children: [
      new Table({
        width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
        columnWidths: [CONTENT_WIDTH_DXA],
        borders: {
          top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
          insideHorizontal: noBorder, insideVertical: noBorder,
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, color: 'auto', fill: BRAND_NAVY },
                margins: { top: 140, bottom: 140, left: 220, right: 220 },
                borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                children: [
                  new Paragraph({
                    spacing: { after: 20 },
                    children: [new TextRun({ text: 'GetSuitel', bold: true, color: 'FFFFFF', size: 24 })],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: titleEn, italics: true, color: 'C9D8F0', size: 16 }),
                      new TextRun({ text: '   —   ', color: 'C9D8F0', size: 16 }),
                      new TextRun({ text: titleAr, italics: true, color: 'C9D8F0', size: 16, rightToLeft: true }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

export function brandedFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60 },
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
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20 },
        children: [new TextRun({ text: '© GetSuitel — getsuitel.com', size: 15, color: 'AAAAAA' })],
      }),
    ],
  })
}
