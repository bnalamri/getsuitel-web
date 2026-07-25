import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

// Open endpoint — called by mobile app when a cheque is marked bounced/returned
// Body: { to, tenantName, chequeNumber, bankName, amount, currency, bounceReason, status, orgName }
export async function POST(req: Request) {
  const {
    to, tenantName, chequeNumber, bankName,
    amount, currency, bounceReason, status, orgName,
  } = await req.json()

  if (!to || !chequeNumber) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const isBounced  = status === 'bounced'
  const headerColor = isBounced ? '#dc2626' : '#9333ea'
  const statusLabel = isBounced ? 'Cheque Bounced' : 'Cheque Returned'
  const bodyText    = isBounced
    ? `Your cheque #${chequeNumber} drawn on <strong>${bankName || 'your bank'}</strong> was returned due to insufficient funds or other bank reasons.`
    : `Your cheque #${chequeNumber} drawn on <strong>${bankName || 'your bank'}</strong> has been returned to you.`

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:${headerColor};padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.65);margin-top:4px">${statusLabel}</div>
</td></tr>
<tr><td style="padding:32px">
  <div style="font-size:15px;color:#334155;margin-bottom:24px;line-height:1.7">
    Dear ${tenantName || 'Tenant'},<br><br>
    ${bodyText}<br><br>
    Please contact your property manager as soon as possible to arrange an alternative payment.
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
    <tr><td style="padding:14px 20px;border-bottom:1px solid #e2e8f0">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Cheque Number</div>
      <div style="font-size:16px;font-weight:800;color:#0f172a;margin-top:4px">#${chequeNumber}</div>
    </td></tr>
    <tr><td style="padding:14px 20px;border-bottom:1px solid #e2e8f0">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Amount</div>
      <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:4px">${Number(amount || 0).toLocaleString()} ${currency || 'OMR'}</div>
    </td></tr>
    ${bounceReason ? `<tr><td style="padding:14px 20px;border-bottom:1px solid #e2e8f0">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Reason</div>
      <div style="font-size:14px;font-weight:600;color:#dc2626;margin-top:4px">${bounceReason}</div>
    </td></tr>` : ''}
    ${orgName ? `<tr><td style="padding:14px 20px">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Property Manager</div>
      <div style="font-size:14px;font-weight:600;color:#334155;margin-top:4px">${orgName}</div>
    </td></tr>` : ''}
  </table>

  <div style="margin-top:20px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px">
    <div style="font-size:13px;color:#dc2626;font-weight:700">⚠ Action Required</div>
    <div style="font-size:12px;color:#7f1d1d;margin-top:4px">Please arrange an alternative payment method (cash, bank transfer, or replacement cheque) immediately.</div>
  </div>
</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</td></tr>
</table></td></tr></table>
</body></html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'GetSuitel <invoices@getsuitel.com>',
      to: [to],
      subject: `${statusLabel}: Cheque #${chequeNumber} — ${Number(amount || 0).toLocaleString()} ${currency || 'OMR'}`,
      html,
    })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ id: data?.id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
