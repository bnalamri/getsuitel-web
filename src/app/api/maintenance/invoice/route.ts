import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { requestId, finalAmount, chargeNotes } = await req.json()
  if (!requestId || finalAmount == null) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Verify caller is the assigned technician
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Save final_amount + charge_notes
  const { data: request, error } = await admin
    .from('maintenance_requests')
    .update({ final_amount: finalAmount, charge_notes: chargeNotes || null })
    .eq('id', requestId)
    .eq('technician_id', user.id)
    .select('*, units(unit_number, properties(name))')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send invoice email to owner
  try {
    const [{ data: tech }, { data: org }] = await Promise.all([
      admin.from('profiles').select('full_name').eq('id', user.id).single(),
      admin.from('organizations').select('owner_id, name').eq('id', request.organization_id).single(),
    ])

    const { data: owner } = org?.owner_id
      ? await admin.from('profiles').select('full_name, email').eq('id', org.owner_id).single()
      : { data: null }

    if (owner?.email) {
      const unit = request.units as { unit_number: string; properties: { name: string } | null } | null
      const location = unit ? `${unit.properties?.name ?? ''} — Unit ${unit.unit_number}` : '—'
      const techName = tech?.full_name ?? 'Technician'
      const amountStr = `OMR ${parseFloat(String(finalAmount)).toFixed(3)}`

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:2px;margin-top:2px">SERVICE INVOICE</div>
  <div style="font-size:13px;color:#C9931A;font-weight:700;margin-top:6px">Payment Required</div>
</td></tr>

<tr><td style="padding:28px 32px 0">
  <div style="font-size:18px;font-weight:800;color:#0f172a">Hi ${owner.full_name ?? 'Property Manager'},</div>
  <div style="font-size:14px;color:#64748b;margin-top:6px">A maintenance job has been completed and a service charge has been submitted for your review.</div>
  <div style="height:3px;background:#C9931A;border-radius:2px;width:48px;margin-top:16px"></div>
</td></tr>

<tr><td style="padding:20px 32px">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;width:160px;font-size:13px;font-weight:600;color:#64748b">Job</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${request.title}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#64748b">Location</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${location}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#64748b">Technician</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${techName}</td>
    </tr>
    ${chargeNotes ? `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#64748b">Notes</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${String(chargeNotes).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
    </tr>` : ''}
    <tr>
      <td style="padding:16px 0 0;font-size:14px;font-weight:700;color:#64748b">Amount Due</td>
      <td style="padding:16px 0 0;font-size:22px;font-weight:900;color:#1B3A6B">${amountStr}</td>
    </tr>
  </table>
</td></tr>

<tr><td style="padding:0 32px 28px">
  <a href="https://www.getsuitel.com/dashboard/owner/maintenance" style="display:inline-block;background:#1B3A6B;color:#fff;font-size:13px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none">View &amp; Confirm Payment →</a>
</td></tr>

<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:11px;color:#94a3b8">Sent via getsuitel.com · ${new Date().toUTCString()}</div>
</td></tr>

</table></td></tr></table>
</body></html>`

      await resend.emails.send({
        from: 'GetSuitel <notices@getsuitel.com>',
        to: [owner.email],
        subject: `Service invoice: ${request.title} — ${amountStr}`,
        html,
      })
    }
  } catch {
    // Email failure doesn't fail the submission
  }

  return NextResponse.json({ ok: true })
}
