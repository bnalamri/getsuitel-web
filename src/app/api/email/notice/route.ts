import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { to, subject, body, type, attachmentUrl } = await req.json()
  if (!to || !subject || !body) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const isLate = type === 'late_payment'
  const borderColor = isLate ? '#dc2626' : '#1B3A6B'
  const badgeColor = isLate ? '#fee2e2' : '#dbeafe'
  const badgeText = isLate ? '#dc2626' : '#1d4ed8'
  const badgeLabel = isLate ? 'Late Payment Notice' : 'General Notice'

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:2px;margin-top:2px">SMART REAL ESTATE MANAGEMENT</div>
</td></tr>
<tr><td style="padding:24px 32px 0">
  <span style="background:${badgeColor};color:${badgeText};font-size:12px;font-weight:700;padding:4px 12px;border-radius:99px">${badgeLabel}</span>
</td></tr>
<tr><td style="padding:16px 32px 0">
  <div style="font-size:20px;font-weight:800;color:#0f172a">${subject}</div>
</td></tr>
<tr><td style="padding:12px 32px">
  <div style="height:3px;background:${borderColor};border-radius:2px;width:48px"></div>
</td></tr>
<tr><td style="padding:0 32px 24px">
  <div style="font-size:15px;color:#334155;line-height:1.8;white-space:pre-line">${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
</td></tr>
${attachmentUrl ? `<tr><td style="padding:0 32px 24px">
  <a href="${attachmentUrl}" style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;color:#1B3A6B;text-decoration:none;font-size:13px;font-weight:600;padding:10px 16px;border-radius:8px">📎 View Attachment</a>
</td></tr>` : ''}
<tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">This notice was sent via GetSuitel. Contact your property manager with any questions.</div>
</td></tr>
</table></td></tr></table>
</body></html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'GetSuitel <notices@getsuitel.com>',
      to: [to],
      subject,
      html,
    })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ id: data?.id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
