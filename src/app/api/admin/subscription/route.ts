import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/api-auth'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@getsuitel.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://getsuitel.com'

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

async function sendCancellationEmailToOwner(ownerEmail: string, ownerName: string, orgName: string, purgeDate: Date) {
  const body = `
    <div style="font-size:15px;color:#334155;line-height:1.8">
      Dear ${ownerName},<br><br>
      Your GetSuitel account for <strong>${orgName}</strong> has been canceled.<br><br>
      Your data will be <strong>retained until ${formatDate(purgeDate)}</strong> (90 days). You can reactivate at any time before this date and all your data will be fully restored.<br><br>
      After ${formatDate(purgeDate)}, all account data will be permanently deleted.
    </div>
    <div style="margin-top:24px">
      <a href="${APP_URL}/register" style="display:inline-block;background:#1B3A6B;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">Reactivate My Account</a>
    </div>
    <div style="margin-top:20px;font-size:13px;color:#64748b">Questions? Contact us at support@getsuitel.com</div>`

  await resend.emails.send({
    from: 'GetSuitel <noreply@getsuitel.com>',
    to: [ownerEmail],
    subject: `Your GetSuitel account has been canceled — data retained until ${formatDate(purgeDate)}`,
    html: emailWrapper('#1B3A6B', 'Account Cancellation Notice', body),
  })
}

async function sendCancellationEmailToAdmin(orgName: string, ownerName: string, ownerEmail: string, purgeDate: Date) {
  const body = `
    <div style="font-size:15px;color:#334155;line-height:1.8">
      An organization has been <strong>canceled</strong>.
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:16px">
      <tr><td style="padding:8px 0;color:#64748b;width:140px">Organization</td><td style="font-weight:600;color:#0f172a">${orgName}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">Owner</td><td style="font-weight:600;color:#0f172a">${ownerName}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">Email</td><td style="font-weight:600;color:#0f172a">${ownerEmail}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">Auto-purge date</td><td style="font-weight:600;color:#dc2626">${formatDate(purgeDate)}</td></tr>
    </table>
    <div style="margin-top:24px">
      <a href="${APP_URL}/dashboard/admin/owners" style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">View in Admin Panel</a>
    </div>`

  await resend.emails.send({
    from: 'GetSuitel <noreply@getsuitel.com>',
    to: [SUPER_ADMIN_EMAIL],
    subject: `[Admin] ${orgName} canceled — data purge scheduled for ${formatDate(purgeDate)}`,
    html: emailWrapper('#7C3AED', 'Admin — Account Canceled', body),
  })
}

export async function POST(req: Request) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const { orgId, plan, status, maxUnits, maxTenants, maxProperties } = await req.json()
  if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch current org + owner for email
  const { data: org } = await admin
    .from('organizations')
    .select('*, profiles!organizations_owner_id_fkey(full_name, email)')
    .eq('id', orgId)
    .single()

  // Plan limits map
  const PLAN_LIMITS: Record<string, { maxProperties: number; maxUnits: number; maxTenants: number }> = {
    basic:      { maxProperties: 2,    maxUnits: 10,   maxTenants: 15 },
    pro:        { maxProperties: 10,   maxUnits: 50,   maxTenants: 75 },
    enterprise: { maxProperties: 20, maxUnits: 9999, maxTenants: 9999 },
  }

  // Downgrade check — only when changing to a more restrictive plan
  if (plan && org?.subscription_plan && plan !== org.subscription_plan) {
    const targetLimits = PLAN_LIMITS[plan]
    const currentLimits = PLAN_LIMITS[org.subscription_plan]
    const isDowngrade = targetLimits && currentLimits &&
      (targetLimits.maxProperties < currentLimits.maxProperties ||
       targetLimits.maxUnits < currentLimits.maxUnits ||
       targetLimits.maxTenants < currentLimits.maxTenants)

    if (isDowngrade && targetLimits) {
      const [{ count: propCount }, { count: unitCount }, { count: tenantCount }] = await Promise.all([
        admin.from('properties').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        admin.from('units').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
        admin.from('tenants').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      ])

      const violations: string[] = []
      if ((propCount ?? 0) > targetLimits.maxProperties)
        violations.push(`${propCount} properties (${plan} limit: ${targetLimits.maxProperties})`)
      if ((unitCount ?? 0) > targetLimits.maxUnits)
        violations.push(`${unitCount} units (${plan} limit: ${targetLimits.maxUnits})`)
      if ((tenantCount ?? 0) > targetLimits.maxTenants)
        violations.push(`${tenantCount} tenants (${plan} limit: ${targetLimits.maxTenants})`)

      if (violations.length > 0) {
        return NextResponse.json({
          error: `Cannot downgrade to ${plan}. Current usage exceeds the plan limits: ${violations.join(', ')}. Please reduce usage before downgrading.`,
        }, { status: 400 })
      }
    }
  }

  const updates: Record<string, unknown> = {
    subscription_plan: plan,
    subscription_status: status,
  }
  if (maxUnits) updates.max_units = Number(maxUnits)
  if (maxTenants) updates.max_tenants = Number(maxTenants)
  if (maxProperties) updates.max_properties = Number(maxProperties)
  // Auto-set limits from plan if not manually overridden
  if (plan && PLAN_LIMITS[plan] && !maxUnits) updates.max_units = PLAN_LIMITS[plan].maxUnits
  if (plan && PLAN_LIMITS[plan] && !maxTenants) updates.max_tenants = PLAN_LIMITS[plan].maxTenants
  if (plan && PLAN_LIMITS[plan] && !maxProperties) updates.max_properties = PLAN_LIMITS[plan].maxProperties
  if (status === 'active') updates.subscription_ends_at = new Date(Date.now() + 365 * 86400000).toISOString()

  // Set canceled_at when newly canceled
  const wasNotCanceled = org?.subscription_status !== 'canceled'
  if (status === 'canceled' && wasNotCanceled) {
    updates.canceled_at = new Date().toISOString()
  }
  // Clear canceled_at if reactivating
  if (status !== 'canceled') {
    updates.canceled_at = null
  }

  const { error } = await admin.from('organizations').update(updates).eq('id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send emails when newly canceled
  if (status === 'canceled' && wasNotCanceled && org) {
    const owner = org.profiles as { full_name: string; email: string } | null
    const purgeDate = new Date(Date.now() + 90 * 86400000)
    try {
      await Promise.all([
        owner?.email
          ? sendCancellationEmailToOwner(owner.email, owner.full_name || 'Owner', org.name, purgeDate)
          : Promise.resolve(),
        sendCancellationEmailToAdmin(org.name, owner?.full_name || 'Unknown', owner?.email || 'Unknown', purgeDate),
      ])
    } catch (e) {
      console.error('Cancellation email error:', e)
    }
  }

  return NextResponse.json({ ok: true })
}
