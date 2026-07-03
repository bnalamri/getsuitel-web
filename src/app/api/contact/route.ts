import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { name, email, gsm, whatsapp, country, bestTime, message } = await req.json()

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:2px;margin-top:2px">NEW CONTACT FORM SUBMISSION</div>
</td></tr>

<tr><td style="padding:28px 32px 0">
  <div style="font-size:18px;font-weight:800;color:#0f172a">New message from ${name}</div>
  <div style="height:3px;background:#C9931A;border-radius:2px;width:48px;margin-top:10px"></div>
</td></tr>

<tr><td style="padding:20px 32px">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;width:140px;font-size:13px;font-weight:600;color:#64748b">Full Name</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${name}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#64748b">Email</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a"><a href="mailto:${email}" style="color:#1B3A6B">${email}</a></td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#64748b">GSM / Phone</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${gsm || '—'}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#64748b">WhatsApp</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${whatsapp || '—'}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#64748b">Country</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${country || '—'}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;font-size:13px;font-weight:600;color:#64748b">Best Time to Call</td>
      <td style="padding:10px 0;font-size:13px;color:#0f172a">${bestTime || '—'}</td>
    </tr>
  </table>
</td></tr>

<tr><td style="padding:0 32px 28px">
  <div style="background:#f8fafc;border-left:4px solid #1B3A6B;border-radius:0 8px 8px 0;padding:16px 20px">
    <div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Message</div>
    <div style="font-size:14px;color:#334155;line-height:1.8;white-space:pre-line">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  </div>
</td></tr>

<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:11px;color:#94a3b8">Sent via getsuitel.com contact form · ${new Date().toUTCString()}</div>
</td></tr>

</table></td></tr></table>
</body></html>`

  try {
    const { error } = await resend.emails.send({
      from: 'GetSuitel Contact <notices@getsuitel.com>',
      to: ['getsuitelmail@omanportal.net'],
      replyTo: email,
      subject: `New message from ${name} (${country || 'Unknown'})`,
      html,
    })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
