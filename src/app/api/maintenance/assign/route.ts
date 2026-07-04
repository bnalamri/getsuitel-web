import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const priorityBg: Record<string, string> = {
  urgent: '#DC2626', high: '#EA580C', medium: '#CA8A04', low: '#64748b',
}
const priorityLabel: Record<string, string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
}

export async function POST(req: Request) {
  const { requestId, technicianId } = await req.json()

  if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })

  const supabase = createAdminClient()

  // Update the request
  const { error } = await supabase
    .from('maintenance_requests')
    .update({
      technician_id: technicianId || null,
      status: technicianId ? 'assigned' : 'open',
    })
    .eq('id', requestId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email to technician if assigned
  if (technicianId) {
    try {
      // Fetch request details + technician profile in parallel
      const [{ data: request }, { data: tech }] = await Promise.all([
        supabase
          .from('maintenance_requests')
          .select('title, description, category, priority, units(unit_number, properties(name))')
          .eq('id', requestId)
          .single(),
        supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', technicianId)
          .single(),
      ])

      if (tech?.email && request) {
        const unit = request.units as { unit_number: string; properties: { name: string } | null } | null
        const bgColor = priorityBg[request.priority] ?? '#64748b'
        const label = priorityLabel[request.priority] ?? request.priority
        const location = unit ? `${unit.properties?.name ?? ''} — Unit ${unit.unit_number}` : '—'

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:2px;margin-top:2px">WORK ORDER ASSIGNED</div>
  <div style="font-size:13px;color:#C9931A;font-weight:700;margin-top:6px">You have a new assignment</div>
</td></tr>

<tr><td style="padding:28px 32px 0">
  <div style="font-size:18px;font-weight:800;color:#0f172a">Hi ${tech.full_name},</div>
  <div style="font-size:14px;color:#64748b;margin-top:6px">A maintenance request has been assigned to you. Please review the details below and proceed as soon as possible.</div>
  <div style="height:3px;background:#C9931A;border-radius:2px;width:48px;margin-top:16px"></div>
</td></tr>

<tr><td style="padding:20px 32px">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;width:140px;font-size:13px;font-weight:600;color:#64748b">Location</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${location}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#64748b">Title</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${request.title}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#64748b">Category</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;text-transform:capitalize">${request.category}</td>
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
    <div style="font-size:14px;color:#334155;line-height:1.8;white-space:pre-line">${request.description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  </div>
</td></tr>

<tr><td style="padding:0 32px 28px">
  <a href="https://www.getsuitel.com/dashboard/technician/orders" style="display:inline-block;background:#1B3A6B;color:#fff;font-size:13px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none">View My Work Orders →</a>
</td></tr>

<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:11px;color:#94a3b8">Sent via getsuitel.com · ${new Date().toUTCString()}</div>
</td></tr>

</table></td></tr></table>
</body></html>`

        await resend.emails.send({
          from: 'GetSuitel <notices@getsuitel.com>',
          to: [tech.email],
          subject: `Work order assigned: ${request.title} (${label} priority)`,
          html,
        })
      }
    } catch {
      // Don't fail the assignment if email fails
    }
  }

  return NextResponse.json({ ok: true })
}
