import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const dynamic = 'force-dynamic'

function emailHtml(headerColor: string, subtitle: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:${headerColor};padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">${subtitle}</div>
</td></tr>
<tr><td style="padding:32px">${body}</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</td></tr>
</table></td></tr></table></body></html>`
}

// GET /api/cron/subscriptions — daily subscription expiry check
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin   = createAdminClient()
  const now     = new Date()
  const in7days = new Date(now.getTime() + 7 * 86400000).toISOString()
  const errors: string[] = []
  let remindersSent = 0
  let expiredMarked = 0

  // ── Step 1: Send 7-day renewal reminders (only once per cycle) ──────────────
  const { data: expiringSoon } = await admin
    .from('organizations')
    .select('id, name, subscription_plan, subscription_expires_at, profiles!organizations_owner_id_fkey(email, full_name)')
    .eq('subscription_status', 'active')
    .lte('subscription_expires_at', in7days)
    .gt('subscription_expires_at', now.toISOString())
    .is('subscription_reminder_sent_at', null)

  for (const org of expiringSoon ?? []) {
    const ownerEmail = (org.profiles as { email?: string; full_name?: string })?.email
    const ownerName  = (org.profiles as { email?: string; full_name?: string })?.full_name ?? 'there'
    const expiresAt  = new Date(org.subscription_expires_at!)
    const daysLeft   = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000)
    const expiryStr  = expiresAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

    if (ownerEmail) {
      const body = `
        <div style="font-size:15px;color:#334155;line-height:1.8">
          Dear ${ownerName},<br><br>
          Your <strong>${org.subscription_plan}</strong> subscription for <strong>${org.name}</strong>
          expires in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> on <strong>${expiryStr}</strong>.
          <br><br>
          To continue using GetSuitel without interruption, please submit your renewal payment proof.
        </div>
        <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:8px;margin:24px 0;font-size:14px;color:#92400e">
          <strong>Expires:</strong> ${expiryStr} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining)
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getsuitel.com'}/dashboard/owner/subscription"
           style="display:inline-block;background:#1B3A6B;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
          Renew My Subscription
        </a>`

      await resend.emails.send({
        from: 'GetSuitel <notices@getsuitel.com>',
        to: [ownerEmail],
        subject: `Action required: Your subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — ${org.name}`,
        html: emailHtml('#b45309', 'Subscription Renewal Reminder', body),
      }).catch(e => errors.push(`reminder email to ${ownerEmail}: ${e.message}`))

      // Mark reminder sent so we don't send again this cycle
      await admin
        .from('organizations')
        .update({ subscription_reminder_sent_at: now.toISOString() })
        .eq('id', org.id)

      remindersSent++
    }
  }

  // ── Step 2: Mark expired subscriptions as past_due ──────────────────────────
  const { data: expired } = await admin
    .from('organizations')
    .select('id, name, subscription_plan, subscription_expires_at, profiles!organizations_owner_id_fkey(email, full_name)')
    .eq('subscription_status', 'active')
    .lt('subscription_expires_at', now.toISOString())

  for (const org of expired ?? []) {
    await admin
      .from('organizations')
      .update({ subscription_status: 'past_due' })
      .eq('id', org.id)

    const ownerEmail = (org.profiles as { email?: string; full_name?: string })?.email
    const ownerName  = (org.profiles as { email?: string; full_name?: string })?.full_name ?? 'there'

    if (ownerEmail) {
      const body = `
        <div style="font-size:15px;color:#334155;line-height:1.8">
          Dear ${ownerName},<br><br>
          Your <strong>${org.subscription_plan}</strong> subscription for <strong>${org.name}</strong>
          has expired. Your account is now on hold — please renew to restore full access.
        </div>
        <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 18px;border-radius:8px;margin:24px 0;font-size:14px;color:#991b1b">
          <strong>Status:</strong> Expired — access suspended
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getsuitel.com'}/dashboard/owner/subscription"
           style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
          Renew Now
        </a>`

      await resend.emails.send({
        from: 'GetSuitel <notices@getsuitel.com>',
        to: [ownerEmail],
        subject: `Your subscription has expired — ${org.name}`,
        html: emailHtml('#dc2626', 'Subscription Expired', body),
      }).catch(e => errors.push(`expiry email to ${ownerEmail}: ${e.message}`))
    }

    expiredMarked++
  }

  return NextResponse.json({
    ok: true,
    date: now.toISOString(),
    remindersSent,
    expiredMarked,
    errors,
  })
}
