import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { logCron } from '@/lib/cron-logger'
import { isOrgMidnight } from '@/lib/countries'

const resend        = new Resend(process.env.RESEND_API_KEY)
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@getsuitel.com'
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL   || 'https://getsuitel.com'

// ── Timeline ──────────────────────────────────────────────────────────────────
//  Day 0 : Trial subscription_expires_at passes
//          → status = 'expired', trial_expired_at = now
//          → Email: "Trial expired — convert or export your data"
//  Day 30: trial_expired_at < now - 30d AND trial_purge_warning_at IS NULL
//          → trial_purge_warning_at = now
//          → Email: "Final warning — account deleted in 7 days"
//  Day 37: trial_expired_at < now - 37d
//          → Cascade-delete all org data + audit log + email superadmin
// ─────────────────────────────────────────────────────────────────────────────

const DAYS_TO_WARNING = 30
const DAYS_TO_PURGE   = 37

function msDay(n: number) { return n * 86_400_000 }

function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

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

async function purgeOrganization(admin: ReturnType<typeof createAdminClient>, orgId: string) {
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
  await admin.from('org_payment_settings').delete().eq('organization_id', orgId)
  await admin.from('organizations').delete().eq('id', orgId)
}

// GET /api/cron/trial-cleanup — runs hourly; processes each org at its local midnight
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const _start = Date.now()
  const admin  = createAdminClient()
  const now    = new Date()
  const errors: string[] = []
  const url    = new URL(req.url)
  const force  = url.searchParams.get('force') === 'true'

  let expired  = 0   // trialing → expired (Day 0)
  let warnings = 0   // final warning emails sent (Day 30)
  let purged   = 0   // orgs cascade-deleted (Day 37)

  // ── Timezone filter: only process orgs at their local midnight ────────────
  // Fetch all non-canceled orgs with their timezone
  const { data: allOrgs } = await admin
    .from('organizations')
    .select('id, org_timezone')
    .not('subscription_status', 'eq', 'canceled')

  const eligibleIds = new Set(
    force
      ? (allOrgs ?? []).map(o => o.id as string)
      : (allOrgs ?? [])
          .filter(o => isOrgMidnight((o.org_timezone as string) ?? 'UTC'))
          .map(o => o.id as string)
  )

  if (eligibleIds.size === 0)
    return NextResponse.json({ ok: true, skipped: true, reason: 'no orgs at midnight' })

  // ── Phase 1: Mark expired trialing orgs ──────────────────────────────────
  // Trialing orgs whose trial end date has passed and haven't been marked yet
  const { data: justExpired } = await admin
    .from('organizations')
    .select('id, name, subscription_plan, subscription_expires_at, profiles!organizations_owner_id_fkey(email, full_name)')
    .eq('subscription_status', 'trialing')
    .not('subscription_expires_at', 'is', null)
    .lt('subscription_expires_at', now.toISOString())
    .is('trial_expired_at', null)

  for (const org of (justExpired ?? []).filter(o => eligibleIds.has(o.id))) {
    const owner       = org.profiles as { email?: string; full_name?: string } | null
    const ownerEmail  = owner?.email
    const ownerName   = owner?.full_name ?? 'there'
    const purgeDate   = new Date(now.getTime() + msDay(DAYS_TO_PURGE))

    // Mark as expired
    await admin
      .from('organizations')
      .update({ subscription_status: 'expired', trial_expired_at: now.toISOString() })
      .eq('id', org.id)

    // Email owner
    if (ownerEmail) {
      const body = `
        <div style="font-size:15px;color:#334155;line-height:1.8">
          Dear ${ownerName},<br><br>
          Your free trial for <strong>${org.name}</strong> has ended.
          Your account data is safe for now, but your workspace is on hold until you subscribe.<br><br>
          <strong>You have ${DAYS_TO_PURGE} days</strong> to either upgrade or export your data
          before it is permanently removed on <strong>${formatDate(purgeDate)}</strong>.
        </div>
        <div style="background:#fef3c7;border-left:4px solid #d97706;padding:14px 18px;border-radius:8px;margin:24px 0;font-size:14px;color:#92400e">
          <strong>Data deletion scheduled:</strong> ${formatDate(purgeDate)}<br>
          Subscribe before this date to keep all your properties, tenants, and contracts.
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">
          <a href="${APP_URL}/dashboard/owner/subscription"
             style="display:inline-block;background:#1B3A6B;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin-right:12px">
            Upgrade Now
          </a>
          <a href="${APP_URL}/dashboard/owner"
             style="display:inline-block;background:#e2e8f0;color:#334155;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
            Export My Data
          </a>
        </div>`

      await resend.emails.send({
        from: 'GetSuitel <notices@getsuitel.com>',
        to:   [ownerEmail],
        subject: `Your GetSuitel trial has ended — ${DAYS_TO_PURGE} days to upgrade or export`,
        html: emailHtml('#b45309', 'Trial Ended', body),
      }).catch(e => errors.push(`trial-expired email ${ownerEmail}: ${e.message}`))
    }

    expired++
  }

  // ── Phase 2: Send 7-day final warning (Day 30) ────────────────────────────
  const warningCutoff = new Date(now.getTime() - msDay(DAYS_TO_WARNING)).toISOString()

  const { data: nearingPurge } = await admin
    .from('organizations')
    .select('id, name, trial_expired_at, profiles!organizations_owner_id_fkey(email, full_name)')
    .eq('subscription_status', 'expired')
    .lt('trial_expired_at', warningCutoff)
    .is('trial_purge_warning_at', null)

  for (const org of (nearingPurge ?? []).filter(o => eligibleIds.has(o.id))) {
    const owner      = org.profiles as { email?: string; full_name?: string } | null
    const ownerEmail = owner?.email
    const ownerName  = owner?.full_name ?? 'there'
    const purgeDate  = new Date(new Date(org.trial_expired_at!).getTime() + msDay(DAYS_TO_PURGE))
    const daysLeft   = Math.max(0, Math.ceil((purgeDate.getTime() - now.getTime()) / 86_400_000))

    // Record warning sent
    await admin
      .from('organizations')
      .update({ trial_purge_warning_at: now.toISOString() })
      .eq('id', org.id)

    if (ownerEmail) {
      const body = `
        <div style="font-size:15px;color:#334155;line-height:1.8">
          Dear ${ownerName},<br><br>
          This is your <strong>final notice</strong>. Your GetSuitel account for
          <strong>${org.name}</strong> and all associated data (properties, units, tenants,
          contracts, invoices) will be <strong style="color:#dc2626">permanently deleted
          in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} on ${formatDate(purgeDate)}</strong>.<br><br>
          This action cannot be undone.
        </div>
        <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 18px;border-radius:8px;margin:24px 0;font-size:14px;color:#991b1b">
          <strong>⚠️ Permanent deletion on:</strong> ${formatDate(purgeDate)}
        </div>
        <a href="${APP_URL}/dashboard/owner/subscription"
           style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
          Subscribe Now to Save My Data
        </a>`

      await resend.emails.send({
        from: 'GetSuitel <notices@getsuitel.com>',
        to:   [ownerEmail],
        subject: `⚠️ Final warning: Your data will be deleted in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — ${org.name}`,
        html: emailHtml('#dc2626', 'Final Deletion Warning', body),
      }).catch(e => errors.push(`purge-warning email ${ownerEmail}: ${e.message}`))
    }

    warnings++
  }

  // ── Phase 3: Auto-purge (Day 37+) ────────────────────────────────────────
  const purgeCutoff = new Date(now.getTime() - msDay(DAYS_TO_PURGE)).toISOString()

  const { data: toPurge } = await admin
    .from('organizations')
    .select('*, profiles!organizations_owner_id_fkey(full_name, email)')
    .eq('subscription_status', 'expired')
    .lt('trial_expired_at', purgeCutoff)

  for (const org of (toPurge ?? []).filter(o => eligibleIds.has(o.id))) {
    const owner = org.profiles as { full_name: string; email: string } | null

    try {
      // Count data for audit
      const [{ count: unitsCount }, { count: tenantsCount }] = await Promise.all([
        admin.from('units').select('*',   { count: 'exact', head: true }).eq('organization_id', org.id),
        admin.from('tenants').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
      ])

      // Audit record
      await admin.from('deleted_accounts').insert({
        org_id:        org.id,
        org_name:      org.name,
        org_name_ar:   org.name_ar,
        owner_name:    owner?.full_name,
        owner_email:   owner?.email,
        plan:          org.subscription_plan,
        units_count:   unitsCount   ?? 0,
        tenants_count: tenantsCount ?? 0,
        joined_at:     org.created_at,
        canceled_at:   org.trial_expired_at,   // trial expiry as the "exit" date
        purged_at:     now.toISOString(),
        purged_by:     'auto',
        reason:        `auto_purge_trial_expired_${DAYS_TO_PURGE}d`,
      })

      // Cascade delete
      await purgeOrganization(admin, org.id)

      // Notify superadmin
      const trialExpiredOn = org.trial_expired_at ? formatDate(new Date(org.trial_expired_at)) : '—'
      const body = `
        <div style="font-size:15px;color:#334155;line-height:1.8">
          The following organization has been <strong>automatically purged</strong>
          after ${DAYS_TO_PURGE} days of trial expiry with no subscription.
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px">
          <tr><td style="padding:8px 0;color:#64748b;width:140px">Organization</td><td style="font-weight:600;color:#0f172a">${org.name}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Owner</td><td style="font-weight:600;color:#0f172a">${owner?.full_name || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Email</td><td style="font-weight:600;color:#0f172a">${owner?.email || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Plan</td><td style="font-weight:600;color:#0f172a">${org.subscription_plan}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Trial expired</td><td style="font-weight:600;color:#0f172a">${trialExpiredOn}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Purged on</td><td style="font-weight:600;color:#dc2626">${formatDate(now)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Units deleted</td><td style="font-weight:600;color:#0f172a">${unitsCount  ?? 0}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Tenants deleted</td><td style="font-weight:600;color:#0f172a">${tenantsCount ?? 0}</td></tr>
        </table>
        <div style="margin-top:16px;font-size:13px;color:#64748b">Audit record saved to deleted_accounts table.</div>`

      await resend.emails.send({
        from: 'GetSuitel <noreply@getsuitel.com>',
        to:   [SUPER_ADMIN_EMAIL],
        subject: `[Admin] ${org.name} — trial account purged (${DAYS_TO_PURGE}d no subscription)`,
        html: emailHtml('#dc2626', 'Admin — Trial Account Purged', body),
      }).catch(e => errors.push(`admin purge email: ${e.message}`))

      purged++
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`purge failed for ${org.name}: ${msg}`)
    }
  }

  await logCron({
    jobName:    'trial_cleanup',
    status:     errors.length > 0 ? 'partial' : 'success',
    summary:    { expired, warnings, purged, errors: errors.length },
    durationMs: Date.now() - _start,
  })

  return NextResponse.json({
    ok:       true,
    date:     now.toISOString(),
    timeline: `Day 0 → expired | Day ${DAYS_TO_WARNING} → warning | Day ${DAYS_TO_PURGE} → purge`,
    expired,
    warnings,
    purged,
    errors,
  })
}
