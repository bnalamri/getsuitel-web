import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const HQ_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'hq_admin@getsuitel.com'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, branch_name')
    .eq('id', user.id)
    .single()

  const senderName = profile?.full_name || user.email
  const branchName = profile?.branch_name || 'Unknown Branch'

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">Branch Contact — Suspension Enquiry</div>
</td></tr>
<tr><td style="padding:32px">
  <div style="font-size:15px;color:#334155;line-height:1.8;margin-bottom:24px">
    A message from a suspended branch superadmin:
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:10px 0;color:#64748b;width:140px">Branch</td>
      <td style="font-weight:600;color:#0f172a">${branchName}</td>
    </tr>
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:10px 0;color:#64748b">Superadmin</td>
      <td style="font-weight:600;color:#0f172a">${senderName}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;color:#64748b">Email</td>
      <td style="font-weight:600;color:#0f172a"><a href="mailto:${user.email}" style="color:#1B3A6B">${user.email}</a></td>
    </tr>
  </table>
  <div style="background:#f8fafc;border-radius:12px;padding:20px;font-size:14px;color:#334155;line-height:1.8;white-space:pre-wrap">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  <div style="margin-top:24px;font-size:12px;color:#94a3b8">Reply directly to this email to reach the superadmin at ${user.email}</div>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`

  try {
    await resend.emails.send({
      from: 'GetSuitel <noreply@getsuitel.com>',
      to: HQ_EMAIL,
      replyTo: user.email,
      subject: `Branch Contact: ${branchName} — Suspension Enquiry`,
      html,
    })
  } catch (err) {
    console.error('contact-hq email error:', err)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
