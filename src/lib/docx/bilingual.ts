// Shared EN/AR paragraph helpers for generated .docx legal documents
// (HQ Branch Franchise Agreement, Tenant Agreement). Each "Bi" helper
// renders an English block immediately followed by its Arabic mirror
// (right-aligned, `bidirectional: true` on the paragraph + `rightToLeft: true`
// on the run, so Word lays the Arabic out RTL). Extracted here so both
// generators stay visually and structurally consistent instead of
// duplicating the same ~150 lines.
import {
  Paragraph, TextRun, HeadingLevel, BorderStyle, AlignmentType,
} from 'docx'

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

// Small note shown under a free-text field the user typed themselves,
// flagging that it was not machine-translated (used for custom clauses /
// obligations overrides where auto-translating someone else's legal
// wording would risk introducing an inaccurate translation).
export function untranslatedNoteAr(noteAr: string) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { after: 160 },
    children: [new TextRun({ text: noteAr, italics: true, size: 18, color: '888888', rightToLeft: true })],
  })
}
