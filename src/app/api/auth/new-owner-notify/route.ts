import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@getsuitel.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://getsuitel.com'

export async function POST(req: Request) {
  const { ownerName, ownerEmail, ownerPhone, orgName, plan } = await req.json()

  if (!ownerEmail || !orgName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const planLabel = plan
    ? plan.charAt(0).toUpperCase() + plan.slice(1)
    : 'Basic'

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">Admin — New Owner Registration</div>
</td></tr>
<tr><td style="padding:32px">
  <div style="font-size:15px;color:#334155;line-height:1.8;margin-bottom:20px">
    A new owner has registered and is <strong>pending email verification</strong>.
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:10px 0;color:#64748b;width:140px">Organization</td>
      <td style="font-weight:600;color:#0f172a">${orgName}</td>
    </tr>
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:10px 0;color:#64748b">Owner Name</td>
      <td style="font-weight:600;color:#0f172a">${ownerName || '—'}</td>
    </tr>
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:10px 0;color:#64748b">Email</td>
      <td style="font-weight:600;color:#0f172a">${ownerEmail}</td>
    </tr>
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:10px 0;color:#64748b">Phone</td>
      <td style="font-weight:600;color:#0f172a">${ownerPhone || '—'}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;color:#64748b">Selected Plan</td>
      <td style="font-weight:600;color:#0f172a">${planLabel} (Trialing)</td>
    </tr>
  </table>
  <div style="margin-top:24px;padding:16px;background:#fef9ec;border:1px solid #fcd34d;border-radius:10px;font-size:13px;color:#92400e">
    ⏳ Account is pending email verification. Once verified, go to the Admin Panel to activate their subscription.
  </div>
  <div style="margin-top:20px">
    <a href="${APP_URL}/dashboard/admin/owners"
       style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
      View in Admin Panel
    </a>
  </div>
</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</td></tr>
</table></td></tr></table></body></html>`

  try {
    await resend.emails.send({
      from: 'GetSuitel <noreply@getsuitel.com>',
      to: [SUPER_ADMIN_EMAIL],
      subject: `[Admin] New owner registered — ${orgName}`,
      html,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('New owner notify failed:', e)
    return NextResponse.json({ ok: false })
  }
}
