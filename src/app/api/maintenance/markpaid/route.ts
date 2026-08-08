import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { requestId } = await req.json()
  if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })

  // Support cookie auth (web) and Bearer token auth (mobile)
  const admin = createAdminClient()
  let userId: string | null = null
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const { data: { user: mobileUser } } = await admin.auth.getUser(authHeader.slice(7))
    userId = mobileUser?.id ?? null
  } else {
    const supabase = await createClient()
    const { data: { user: webUser } } = await supabase.auth.getUser()
    userId = webUser?.id ?? null
  }
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin
    .from('profiles').select('role, organization_id').eq('id', userId).single()

  if (!profile || !['owner', 'property_manager', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Mark invoice as paid
  const { error } = await admin
    .from('maintenance_requests')
    .update({ invoice_paid: true })
    .eq('id', requestId)
    .eq('organization_id', profile.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch request details for expense + email
  try {
    const { data: request } = await admin
      .from('maintenance_requests')
      .select('final_amount, unit_id, title, charge_notes, organization_id, technician_id, units(unit_number, properties(name))')
      .eq('id', requestId)
      .single()

    if (!request) throw new Error('Request not found')

    // ── Auto-record as property expense ──────────────────────────────────────
    if (request.final_amount && request.unit_id) {
      const { data: unit } = await admin
        .from('units').select('property_id').eq('id', request.unit_id).single()

      if (unit?.property_id) {
        await admin.from('expenses').upsert({
          organization_id:        request.organization_id,
          property_id:            unit.property_id,
          maintenance_request_id: requestId,
          date:                   new Date().toISOString().split('T')[0],
          category:               'Maintenance',
          description:            request.title,
          amount:                 request.final_amount,
          currency:               'OMR',
          notes:                  request.charge_notes ?? null,
        }, { onConflict: 'maintenance_request_id', ignoreDuplicates: true })
      }
    }

    // ── Notify technician by email ────────────────────────────────────────────
    if (request.technician_id && request.final_amount) {
      const [{ data: techProfile }, { data: { user: techUser } }] = await Promise.all([
        admin.from('profiles').select('full_name').eq('id', request.technician_id).single(),
        admin.auth.admin.getUserById(request.technician_id),
      ])

      const techEmail = techUser?.email ?? null
      if (techEmail) {
        const unit      = request.units as { unit_number: string; properties: { name: string } | null } | null
        const location  = unit ? `${unit.properties?.name ?? ''} — Unit ${unit.unit_number}` : '—'
        const techName  = techProfile?.full_name ?? 'Technician'
        const amountStr = `OMR ${parseFloat(String(request.final_amount)).toFixed(3)}`
        const dateStr   = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:2px;margin-top:2px">PAYMENT RECEIVED</div>
  <div style="font-size:13px;color:#4ade80;font-weight:700;margin-top:6px">✓ Invoice Paid</div>
</td></tr>

<tr><td style="padding:28px 32px 0">
  <div style="font-size:18px;font-weight:800;color:#0f172a">Hi ${techName},</div>
  <div style="font-size:14px;color:#64748b;margin-top:6px">Great news — the property owner has confirmed payment for your completed job.</div>
  <div style="height:3px;background:#4ade80;border-radius:2px;width:48px;margin-top:16px"></div>
</td></tr>

<tr><td style="padding:20px 32px">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;width:140px;font-size:13px;font-weight:600;color:#64748b">Job</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${request.title}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#64748b">Location</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${location}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#64748b">Date Paid</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a">${dateStr}</td>
    </tr>
    <tr>
      <td style="padding:16px 0 0;font-size:14px;font-weight:700;color:#64748b">Amount Paid</td>
      <td style="padding:16px 0 0;font-size:24px;font-weight:900;color:#16a34a">${amountStr}</td>
    </tr>
  </table>
</td></tr>

<tr><td style="padding:8px 32px 28px">
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;font-size:13px;color:#15803d">
    Your invoice has been settled. Thank you for your service.
  </div>
</td></tr>

<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:11px;color:#94a3b8">Sent via getsuitel.com · ${new Date().toUTCString()}</div>
</td></tr>

</table></td></tr></table>
</body></html>`

        await resend.emails.send({
          from:    'GetSuitel <notices@getsuitel.com>',
          to:      [techEmail],
          subject: `Payment received: ${request.title} — ${amountStr}`,
          html,
        })
      }
    }
  } catch (err) {
    // Neither expense nor email failure should fail the payment response
    console.error('markpaid: post-payment actions failed', err)
  }

  return NextResponse.json({ ok: true })
}
