import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@getsuitel.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://getsuitel.com'
const CRON_SECRET = process.env.CRON_SECRET

function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function emailWrapper(headerColor: string, label: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:${headerColor};padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">${label}</div>
</td></tr>
<tr><td style="padding:32px">${body}</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</td></tr>
</table></td></tr></table></body></html>`
}

async function purgeOrganization(admin: ReturnType<typeof createAdminClient>, orgId: string) {
  // Delete in dependency order
  const tables = [
    'payment_receipts',
    'cheques',
    'invoices',
    'maintenance_requests',
    'notices',
    'contracts',
    'units',
    'properties',
    'tenants',
    'team_members',
  ]

  for (const table of tables) {
    await admin.from(table).delete().eq('organization_id', orgId)
  }

  // Delete org settings
  await admin.from('org_payment_settings').delete().eq('organization_id', orgId)

  // Delete the organization itself
  await admin.from('organizations').delete().eq('id', orgId)
}

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const warningThreshold = new Date(now.getTime() - 83 * 86400000) // 83 days ago
  const purgeThreshold = new Date(now.getTime() - 90 * 86400000)   // 90 days ago

  // Fetch all canceled orgs
  const { data: canceledOrgs } = await admin
    .from('organizations')
    .select('*, profiles!organizations_owner_id_fkey(full_name, email)')
    .eq('subscription_status', 'canceled')
    .not('canceled_at', 'is', null)

  if (!canceledOrgs || canceledOrgs.length === 0) {
    return NextResponse.json({ ok: true, warnings: 0, purged: 0 })
  }

  let warnings = 0
  let purged = 0

  for (const org of canceledOrgs) {
    const canceledAt = new Date(org.canceled_at)
    const owner = org.profiles as { full_name: string; email: string } | null
    const purgeDate = new Date(canceledAt.getTime() + 90 * 86400000)

    // 7-day warning (day 83)
    if (canceledAt <= warningThreshold && canceledAt > purgeThreshold) {
      try {
        if (owner?.email) {
          const body = `
            <div style="font-size:15px;color:#334155;line-height:1.8">
              Dear ${owner.full_name || 'Owner'},<br><br>
              This is a reminder that your GetSuitel account data for <strong>${org.name}</strong> will be <strong style="color:#dc2626">permanently deleted in 7 days on ${formatDate(purgeDate)}</strong>.<br><br>
              Reactivate your account now to keep all your data.
            </div>
            <div style="margin-top:24px">
              <a href="${APP_URL}/register" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">Reactivate Now — 7 Days Left</a>
            </div>`
          await resend.emails.send({
            from: 'GetSuitel <noreply@getsuitel.com>',
            to: [owner.email],
            subject: `⚠️ Your GetSuitel data will be deleted in 7 days — ${formatDate(purgeDate)}`,
            html: emailWrapper('#dc2626', '7-Day Data Deletion Warning', body),
          })
          warnings++
        }
      } catch (e) {
        console.error(`Warning email failed for ${org.name}:`, e)
      }
    }

    // Auto-purge (day 90+)
    if (canceledAt <= purgeThreshold) {
      try {
        // Count data before purge
        const [{ count: unitsCount }, { count: tenantsCount }] = await Promise.all([
          admin.from('units').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
          admin.from('tenants').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
        ])

        // Save audit record
        await admin.from('deleted_accounts').insert({
          org_id: org.id,
          org_name: org.name,
          org_name_ar: org.name_ar,
          owner_name: owner?.full_name,
          owner_email: owner?.email,
          plan: org.subscription_plan,
          units_count: unitsCount ?? 0,
          tenants_count: tenantsCount ?? 0,
          joined_at: org.created_at,
          canceled_at: org.canceled_at,
          purged_at: now.toISOString(),
          purged_by: 'auto',
          reason: 'auto_purge_90_days',
        })

        // Cascade delete all org data
        await purgeOrganization(admin, org.id)

        // Notify super admin
        const body = `
          <div style="font-size:15px;color:#334155;line-height:1.8">
            The following organization has been <strong>automatically purged</strong> after 90 days of cancellation.
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px">
            <tr><td style="padding:8px 0;color:#64748b;width:140px">Organization</td><td style="font-weight:600;color:#0f172a">${org.name}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Owner</td><td style="font-weight:600;color:#0f172a">${owner?.full_name || 'Unknown'}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Email</td><td style="font-weight:600;color:#0f172a">${owner?.email || 'Unknown'}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Canceled on</td><td style="font-weight:600;color:#0f172a">${formatDate(canceledAt)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Purged on</td><td style="font-weight:600;color:#dc2626">${formatDate(now)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Units deleted</td><td style="font-weight:600;color:#0f172a">${unitsCount ?? 0}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Tenants deleted</td><td style="font-weight:600;color:#0f172a">${tenantsCount ?? 0}</td></tr>
          </table>
          <div style="margin-top:16px;font-size:13px;color:#64748b">An audit record has been saved in the deleted_accounts table.</div>`

        await resend.emails.send({
          from: 'GetSuitel <noreply@getsuitel.com>',
          to: [SUPER_ADMIN_EMAIL],
          subject: `[Admin] ${org.name} — data permanently purged today`,
          html: emailWrapper('#dc2626', 'Admin — Account Purged', body),
        })

        purged++
      } catch (e) {
        console.error(`Purge failed for ${org.name}:`, e)
      }
    }
  }

  return NextResponse.json({ ok: true, warnings, purged })
}
