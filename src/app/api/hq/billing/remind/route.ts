import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Auth: HQ admin or finance only
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['hq_admin', 'hq_finance'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { billingId } = await req.json()
  if (!billingId) return NextResponse.json({ error: 'billingId required' }, { status: 400 })

  // Fetch billing record with branch + superadmin email
  const { data: billing, error: billingErr } = await supabase
    .from('branch_billing')
    .select(`
      id, month, total_revenue_omr, share_amount_omr, license_fee_omr, status,
      branches!branch_billing_branch_id_fkey (
        id, display_name,
        profiles!branches_superadmin_id_fkey ( full_name, email )
      )
    `)
    .eq('id', billingId)
    .single()

  if (billingErr || !billing) {
    return NextResponse.json({ error: 'Billing record not found' }, { status: 404 })
  }

  if (billing.status === 'paid') {
    return NextResponse.json({ error: 'This record is already paid' }, { status: 400 })
  }

  const branch = billing.branches as unknown as {
    id: string
    display_name: string
    profiles: { full_name: string | null; email: string } | null
  } | null

  if (!branch?.profiles?.email) {
    return NextResponse.json({ error: 'Branch superadmin email not found' }, { status: 422 })
  }

  const month = new Date(billing.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const totalDue = (Number(billing.share_amount_omr) + Number(billing.license_fee_omr)).toFixed(3)
  const adminName = branch.profiles.full_name ?? 'Branch Admin'
  const branchName = branch.display_name
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getsuitel.com'}/superadmin/billing`

  const { error: emailErr } = await resend.emails.send({
    from: 'GetSuitel HQ <no-reply@getsuitel.com>',
    to: branch.profiles.email,
    subject: `Payment Reminder — ${branchName} · ${month}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
        <div style="background:#1F2937;padding:24px 32px;border-radius:12px 12px 0 0">
          <p style="color:#FBBF24;font-size:13px;font-weight:600;letter-spacing:0.05em;margin:0 0 4px">GETSUITEL HQ</p>
          <h1 style="color:#fff;font-size:22px;margin:0">Payment Reminder</h1>
        </div>
        <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px">
          <p style="margin:0 0 16px">Dear ${adminName},</p>
          <p style="margin:0 0 16px">This is a reminder that the following billing amount is outstanding for <strong>${branchName}</strong>:</p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
            <tr style="background:#F9FAFB">
              <td style="padding:10px 14px;border:1px solid #E5E7EB;font-weight:600">Month</td>
              <td style="padding:10px 14px;border:1px solid #E5E7EB">${month}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;border:1px solid #E5E7EB;font-weight:600">Revenue Share</td>
              <td style="padding:10px 14px;border:1px solid #E5E7EB">${Number(billing.share_amount_omr).toFixed(3)} OMR</td>
            </tr>
            <tr style="background:#F9FAFB">
              <td style="padding:10px 14px;border:1px solid #E5E7EB;font-weight:600">License Fee</td>
              <td style="padding:10px 14px;border:1px solid #E5E7EB">${Number(billing.license_fee_omr).toFixed(3)} OMR</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;border:1px solid #E5E7EB;font-weight:600;color:#DC2626">Total Due</td>
              <td style="padding:10px 14px;border:1px solid #E5E7EB;font-weight:700;color:#DC2626">${totalDue} OMR</td>
            </tr>
          </table>
          <p style="margin:0 0 24px;color:#6B7280;font-size:14px">Please arrange payment at your earliest convenience. If you have already settled this amount, kindly disregard this notice.</p>
          <a href="${dashboardUrl}" style="display:inline-block;background:#F59E0B;color:#111827;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px">View Billing Dashboard →</a>
          <p style="margin:32px 0 0;font-size:13px;color:#9CA3AF;border-top:1px solid #F3F4F6;padding-top:20px">This is an automated reminder from GetSuitel HQ. For queries, contact your HQ admin.</p>
        </div>
      </div>
    `,
  })

  if (emailErr) {
    console.error('[remind] Resend error:', emailErr)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
