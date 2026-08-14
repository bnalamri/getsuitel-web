/**
 * PrintHeader — standard GetSuitel PDF/print header
 * Hidden on screen, visible only when printing or saving as PDF.
 *
 * Usage:
 *   <PrintHeader reportTitle="Monthly Income Report" orgName={orgName} userName={userName} />
 */

interface Props {
  /** E.g. "Monthly Income Report" — shown as subtitle under the navy band */
  reportTitle: string
  /** Organisation display name */
  orgName: string
  /** Full name of the user who triggered the print */
  userName: string
  /** Optional: override the generated-date string (DD/MM/YYYY). Defaults to today. */
  printDate?: string
}

function todayDMY() {
  const d  = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

export default function PrintHeader({ reportTitle, orgName, userName, printDate }: Props) {
  const generated = printDate ?? todayDMY()

  return (
    <div className="mb-5">

      {/* ── Navy title band ──────────────────────────────────────────────── */}
      <div
        style={{
          background: '#1B3A6B',
          color: '#fff',
          padding: '14px 20px 12px',
          borderRadius: '6px 6px 0 0',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px' }}>
          GetSuitel Management Reports
        </div>
        <div style={{ fontSize: '11px', color: '#AAC0E0', marginTop: '3px' }}>
          {orgName}
          {orgName && reportTitle ? ' · ' : ''}
          {reportTitle}
        </div>
        <div style={{ fontSize: '10px', color: '#8BAAD0', marginTop: '2px' }}>
          Generated: {generated}&nbsp;&nbsp;·&nbsp;&nbsp;Printed by:{' '}
          <strong style={{ color: '#C9D8F0' }}>{userName}</strong>
        </div>
      </div>

      {/* ── Confidentiality box ──────────────────────────────────────────── */}
      <div
        style={{
          border: '1.5px solid #E53935',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          padding: '9px 18px 10px',
          background: '#fff',
          marginBottom: '18px',
        }}
      >
        <p
          style={{
            color: '#C62828',
            fontWeight: 700,
            fontSize: '12px',
            textAlign: 'center',
            letterSpacing: '0.5px',
            marginBottom: '4px',
          }}
        >
          STRICTLY CONFIDENTIAL &nbsp;·&nbsp; سري للغاية
        </p>
        <p
          style={{
            fontSize: '10px',
            color: '#333',
            textAlign: 'center',
            lineHeight: '1.55',
            margin: 0,
          }}
        >
          This document is intended solely for authorised internal use within the organisation.
          Unauthorised disclosure, copying, distribution or use of this information is strictly
          prohibited.
        </p>
        <p
          style={{
            fontSize: '10px',
            color: '#333',
            textAlign: 'center',
            marginTop: '4px',
            direction: 'rtl',
            lineHeight: '1.55',
            margin: '4px 0 0',
          }}
        >
          هذه الوثيقة مخصصة للاستعمال الداخلي المصرح به داخل المؤسسة فقط. يُحظر تماماً الإفصاح أو
          التوزيع أو استخدام هذه المعلومات بدون إذن.
        </p>
      </div>
    </div>
  )
}
