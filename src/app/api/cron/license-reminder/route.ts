import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { isOrgMidnight } from '@/lib/countries'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://getsuitel.com'

// Runs hourly — fires the reminder only when it is midnight in the branch's timezone.
// Finds branch_billing records with status='pending' and created_at older than 7 days,
// then emails the branch superadmin if it's midnight in their timezone.
export async function GET(req: Request) {
  const url   = new URL(req.url)
  const force = url.searchParams.get('force') === 'true'

  const supabase = createAdminClient()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Find unpaid billing records older than 7 days
  const { data: unpaid, error } = await supabase
    .from('branch_billing')
    .select(`
      id, month, license_fee_omr, share_amount_omr,
      branches ( id, display_name )
    `)
    .eq('status', 'pending')
    .lt('created_at', sevenDaysAgo.toISOString())

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!unpaid?.length) return NextResponse.json({ ok: true, reminded: 0 })

  const results: { branch: string; email: string; status: string }[] = []

  for (const record of unpaid) {
    const branch = record.branches as { id: string; display_name: string } | null
    if (!branch) continue

    // Get branch superadmin profile + their org timezone
    const { data: admin } = await supabase
      .from('profiles')
      .select('email, full_name, organizations ( org_timezone )')
      .eq('branch_id', branch.id)
      .eq('role', 'superadmin')
      .maybeSingle()

    if (!admin?.email) {
      results.push({ branch: branch.display_name, email: '—', status: 'no_admin_found' })
      continue
    }

    // Timezone-gate: only send at midnight local time (or bypass with ?force=true)
    const orgTz = (admin.organizations as { org_timezone?: string } | null)?.org_timezone ?? 'UTC'
    if (!force && !isOrgMidnight(orgTz)) {
      results.push({ branch: branch.display_name, email: admin.email, status: 'skipped_not_midnight' })
      continue
    }

    const monthLabel = new Date(record.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    const billingUrl = `${APP_URL}/hq/billing`
    const licFee = Number(record.license_fee_omr).toFixed(3)
    const share  = Number(record.share_amount_omr).toFixed(3)
    const total  = (Number(record.license_fee_omr) + Number(record.share_amount_omr)).toFixed(3)

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">License Fee Reminder</div>
</td></tr>
<tr><td style="padding:32px">
  <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 16px">Hi ${admin.full_name ?? 'Branch Admin'},</p>
  <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 24px">
    This is a reminder that your <strong>${monthLabel}</strong> branch billing is still outstanding.
    Please settle the payment at your earliest convenience to avoid any service interruptions.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:24px">
    <tr>
      <td style="font-size:13px;color:#64748b;padding:4px 0">License Fee</td>
      <td style="font-size:13px;color:#1e293b;font-weight:600;text-align:right;padding:4px 0">${licFee} OMR</td>
    </tr>
    <tr>
      <td style="font-size:13px;color:#64748b;padding:4px 0">Revenue Share</td>
      <td style="font-size:13px;color:#1e293b;font-weight:600;text-align:right;padding:4px 0">${share} OMR</td>
    </tr>
    <tr style="border-top:1px solid #e2e8f0">
      <td style="font-size:14px;color:#1e293b;font-weight:700;padding:8px 0 4px">Total Due</td>
      <td style="font-size:14px;color:#C9931A;font-weight:700;text-align:right;padding:8px 0 4px">${total} OMR</td>
    </tr>
  </table>
  <div style="text-align:center;margin:32px 0">
    <a href="${billingUrl}" style="display:inline-block;background:#C9931A;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">View Billing Details</a>
  </div>
  <p style="font-size:12px;color:#94a3b8;margin:0">If you have already made payment, please ensure it is marked as paid in your branch portal. Contact HQ if you need assistance.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`

    try {
      await resend.emails.send({
        from: 'GetSuitel HQ <noreply@getsuitel.com>',
        to: [admin.email],
        subject: `License Fee Reminder — ${monthLabel} payment outstanding`,
        html,
      })
      results.push({ branch: branch.display_name, email: admin.email, status: 'sent' })
    } catch {
      results.push({ branch: branch.display_name, email: admin.email, status: 'email_failed' })
    }
  }

  const sent = results.filter(r => r.status === 'sent').length
  return NextResponse.json({ ok: true, reminded: sent, results })
}
