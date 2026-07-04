import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const priorityLabel: Record<string, string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
}
const priorityBg: Record<string, string> = {
  urgent: '#DC2626', high: '#EA580C', medium: '#CA8A04', low: '#64748b',
}

export async function POST(req: Request) {
  const { orgId, title, description, category, priority, unitNumber, tenantName } = await req.json()

  if (!orgId || !title) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = createAdminClient()

  // Get org + owner profile
  const { data: org } = await supabase
    .from('organizations')
    .select('owner_id, name')
    .eq('id', orgId)
    .single()

  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const { data: owner } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', org.owner_id)
    .single()

  if (!owner?.email) return NextResponse.json({ error: 'Owner email not found' }, { status: 404 })

  const bgColor = priorityBg[priority] ?? '#64748b'
  const label = priorityLabel[priority] ?? priority

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:2px;margin-top:2px">NEW MAINTENANCE REQUEST</div>
  <div style="font-size:13px;color:#C9931A;font-weight:700;margin-top:6px">Tenant Request Submitted</div>
</td></tr>

<tr><td style="padding:28px 32px 0">
  <div style="font-size:18px;font-weight:800;color:#0f172a">New request from ${tenantName}</div>
  <div style="height:3px;background:#C9931A;border-radius:2px;width:48px;margin-top:10px"></div>
</td></tr>

<tr><td style="padding:20px 32px">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;width:140px;font-size:13px;font-weight:600;color:#64748b">Property / Unit</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${unitNumber}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#64748b">Title</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${title}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#64748b">Category</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;text-transform:capitalize">${category}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;font-size:13px;font-weight:600;color:#64748b">Priority</td>
      <td style="padding:10px 0;font-size:13px">
        <span style="background:${bgColor};color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:0.5px">${label}</span>
      </td>
    </tr>
  </table>
</td></tr>

<tr><td style="padding:0 32px 28px">
  <div style="background:#f8fafc;border-left:4px solid #1B3A6B;border-radius:0 8px 8px 0;padding:16px 20px">
    <div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Description</div>
    <div style="font-size:14px;color:#334155;line-height:1.8;white-space:pre-line">${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  </div>
</td></tr>

<tr><td style="padding:0 32px 28px">
  <a href="https://www.getsuitel.com/dashboard/owner/maintenance" style="display:inline-block;background:#1B3A6B;color:#fff;font-size:13px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none">View in Dashboard →</a>
</td></tr>

<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:11px;color:#94a3b8">Sent via getsuitel.com · ${new Date().toUTCString()}</div>
</td></tr>

</table></td></tr></table>
</body></html>`

  try {
    const { error } = await resend.emails.send({
      from: 'GetSuitel <notices@getsuitel.com>',
      to: [owner.email],
      subject: `New maintenance request: ${title} (${label} priority)`,
      html,
    })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
