import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { to, tenantName, amount, currency, dueDate, type, status } = await req.json()
  if (!to || !amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const isPaid = status === 'paid'
  const isOverdue = status === 'overdue'
  const headerColor = isPaid ? '#059669' : isOverdue ? '#dc2626' : '#1B3A6B'
  const badgeLabel = isPaid ? 'Payment Confirmed' : isOverdue ? 'Payment Overdue' : 'New Invoice'

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:${headerColor};padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">${badgeLabel}</div>
</td></tr>
<tr><td style="padding:32px">
  <div style="font-size:15px;color:#334155;margin-bottom:24px;line-height:1.6">
    Dear ${tenantName || 'Tenant'},<br><br>
    ${isPaid
      ? 'Your payment has been received and confirmed. Thank you!'
      : isOverdue
      ? 'Your payment is overdue. Please arrange payment as soon as possible to avoid further action.'
      : `You have a new invoice for your ${type || 'rent'} payment.`}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
    <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Amount</div>
      <div style="font-size:28px;font-weight:900;color:#0f172a;margin-top:4px">${Number(amount).toLocaleString()} ${currency || 'OMR'}</div>
    </td></tr>
    <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Type</div>
      <div style="font-size:14px;font-weight:600;color:#334155;text-transform:capitalize;margin-top:4px">${type}</div>
    </td></tr>
    <tr><td style="padding:16px 20px">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Due Date</div>
      <div style="font-size:14px;font-weight:600;color:${isOverdue ? '#dc2626' : '#334155'};margin-top:4px">${dueDate}</div>
    </td></tr>
  </table>
  <div style="margin-top:24px;font-size:12px;color:#94a3b8">Log in to your GetSuitel portal to view full details.</div>
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
      subject: isPaid
        ? `Payment Confirmed — ${Number(amount).toLocaleString()} ${currency}`
        : `Invoice: ${Number(amount).toLocaleString()} ${currency} due ${dueDate}`,
      html,
    })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ id: data?.id })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
