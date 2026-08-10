import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/api-auth'
import { Resend } from 'resend'
import { logCron } from '@/lib/cron-logger'
import { isOrgMidnight, getOrgLocalDate } from '@/lib/countries'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://getsuitel.com'
const CRON_SECRET = process.env.CRON_SECRET

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function fmtMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long', year: 'numeric',
  })
}

function emailHtml(headerColor: string, label: string, body: string) {
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

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const isCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`
  if (!isCron) {
    const auth = await requireSuperadmin()
    if (!auth.ok) return auth.response
  }

  const _startTime = Date.now()
  const admin = createAdminClient()

  const url   = new URL(req.url)
  const force = url.searchParams.get('force') === 'true'

  // UTC date string for the response summary (not used for org-local logic)
  const _now = new Date()
  const runDateStr = `${_now.getUTCFullYear()}-${String(_now.getUTCMonth()+1).padStart(2,'0')}-${String(_now.getUTCDate()).padStart(2,'0')}`

  // ── Timezone filter: only process orgs where it's currently midnight ────────
  // Pass ?force=true to bypass when triggering manually as superadmin
  const { data: activeOrgs } = await admin
    .from('organizations')
    .select('id, org_timezone')
    .not('subscription_status', 'eq', 'canceled')

  const eligibleOrgs = force
    ? (activeOrgs ?? [])
    : (activeOrgs ?? []).filter(o => isOrgMidnight((o.org_timezone as string) ?? 'UTC'))

  const eligibleOrgIds = eligibleOrgs.map(o => o.id as string)

  // Build timezone map for local-date calculations
  const orgTzMap = new Map<string, string>(
    (activeOrgs ?? []).map(o => [o.id as string, (o.org_timezone as string) ?? 'UTC'])
  )

  if (eligibleOrgIds.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no orgs at midnight' })
  }

  let invoicesCreated = 0
  let invoicesMarkedOverdue = 0
  let contractsExpired = 0
  let emailsSent = 0
  const errors: string[] = []

  // ── 1. Auto-generate monthly rent invoices ────────────────────────────────

  const { data: contracts, error: contractsErr } = await admin
    .from('contracts')
    .select(`
      id, organization_id, tenant_id, unit_id,
      rent_amount, currency, payment_day, payment_method,
      tenants(full_name, email),
      units(unit_number, properties(name))
    `)
    .eq('status', 'active')
    .in('organization_id', eligibleOrgIds)

  if (contractsErr) {
    return NextResponse.json({ error: contractsErr.message }, { status: 500 })
  }

  for (const contract of contracts ?? []) {
    try {
      // Use org-local date so invoice month matches the tenant's calendar, not UTC
      const orgTz   = orgTzMap.get(contract.organization_id as string) ?? 'UTC'
      const { year, month, todayStr } = getOrgLocalDate(orgTz)
      const monthStr   = String(month).padStart(2, '0')
      const monthStart = `${year}-${monthStr}-01`
      const monthEnd   = `${year}-${monthStr}-28`

      const payDay  = Math.min(Number(contract.payment_day ?? 1), 28)
      const dueDate = `${year}-${monthStr}-${String(payDay).padStart(2, '0')}`

      // Only act once the payment day has arrived
      if (todayStr < dueDate) continue

      // Dedup: any rent invoice for this unit+tenant already this month?
      const { data: existing } = await admin
        .from('invoices')
        .select('id')
        .eq('organization_id', contract.organization_id)
        .eq('unit_id', contract.unit_id)
        .eq('tenant_id', contract.tenant_id)
        .eq('type', 'rent')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .limit(1)

      if (existing && existing.length > 0) continue

      // Create invoice — already overdue if today > due date
      const alreadyLate = todayStr > dueDate
      await admin.from('invoices').insert({
        organization_id: contract.organization_id,
        tenant_id:       contract.tenant_id,
        unit_id:         contract.unit_id,
        type:            'rent',
        amount:          Number(contract.rent_amount),
        currency:        contract.currency ?? 'OMR',
        due_date:        dueDate,
        status:          alreadyLate ? 'overdue' : 'sent',
        payment_method:  contract.payment_method ?? 'cash',
        notes:           `Auto-generated — ${fmtMonth(year, month)}`,
      })

      invoicesCreated++

      // Notify tenant
      const tenant = contract.tenants as { full_name: string; email: string | null } | null
      const unit   = contract.units   as { unit_number: string; properties?: { name: string } | null } | null

      if (tenant?.email) {
        const unitLabel = `${unit?.properties?.name ?? ''} — Unit ${unit?.unit_number ?? ''}`
        const amount    = `${Number(contract.rent_amount).toLocaleString()} ${contract.currency ?? 'OMR'}`

        const html = alreadyLate
          ? emailHtml('#dc2626', 'Overdue Rent Notice', `
              <div style="font-size:15px;color:#334155;line-height:1.8">
                Dear ${tenant.full_name},<br><br>
                Your rent of <strong>${amount}</strong> for <strong>${unitLabel}</strong>
                was due on <strong style="color:#dc2626">${fmtDate(dueDate)}</strong> and has not been received.
                Please log in to your tenant portal to make the payment.
              </div>
              <div style="margin-top:24px">
                <a href="${APP_URL}/dashboard/tenant/invoices"
                   style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
                  Pay Now
                </a>
              </div>`)
          : emailHtml('#1e40af', 'Monthly Rent Invoice', `
              <div style="font-size:15px;color:#334155;line-height:1.8">
                Dear ${tenant.full_name},<br><br>
                Your rent invoice for <strong>${fmtMonth(year, month)}</strong> is ready.<br><br>
                <table style="font-size:14px;border-collapse:collapse">
                  <tr><td style="color:#64748b;padding:4px 16px 4px 0">Amount</td><td style="font-weight:600">${amount}</td></tr>
                  <tr><td style="color:#64748b;padding:4px 16px 4px 0">Due Date</td><td style="font-weight:600">${fmtDate(dueDate)}</td></tr>
                  <tr><td style="color:#64748b;padding:4px 16px 4px 0">Unit</td><td style="font-weight:600">${unitLabel}</td></tr>
                </table>
              </div>
              <div style="margin-top:24px">
                <a href="${APP_URL}/dashboard/tenant/invoices"
                   style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
                  View &amp; Pay
                </a>
              </div>`)

        try {
          await resend.emails.send({
            from: 'GetSuitel <noreply@getsuitel.com>',
            to:   [tenant.email],
            subject: alreadyLate
              ? `Rent overdue — ${unit?.unit_number} — ${fmtMonth(year, month)}`
              : `Rent invoice for ${fmtMonth(year, month)} — ${unit?.unit_number}`,
            html,
          })
          emailsSent++
        } catch (e) {
          errors.push(`Email to ${tenant.email}: ${e}`)
        }
      }
    } catch (e) {
      errors.push(`Contract ${contract.id}: ${e}`)
    }
  }

  // ── 2. Mark existing sent invoices overdue + notify ───────────────────────
  // Only invoices already in DB with status='sent' and past their due_date.
  // Email is sent exactly once — on first transition from sent → overdue.
  // After the loop we also send ONE summary email per org to the owner.

  type OverdueItem = { tenant: string; unit: string; amount: string; daysLate: number }
  const overdueByOrg = new Map<string, OverdueItem[]>()

  const { data: sentPastDue } = await admin
    .from('invoices')
    .select(`
      id, organization_id, amount, currency, due_date,
      tenants(full_name, email),
      units(unit_number, properties(name))
    `)
    .eq('status', 'sent')
    .in('organization_id', eligibleOrgIds)

  for (const inv of sentPastDue ?? []) {
    try {
      const orgTz = orgTzMap.get(inv.organization_id as string) ?? 'UTC'
      const { todayStr: orgToday } = getOrgLocalDate(orgTz)
      // Only mark overdue if past due in org-local time
      if (orgToday <= inv.due_date) continue

      await admin.from('invoices').update({ status: 'overdue' }).eq('id', inv.id)
      invoicesMarkedOverdue++

      const tenant = inv.tenants as { full_name: string; email: string | null } | null
      const unit   = inv.units   as { unit_number: string; properties?: { name: string } | null } | null
      const daysLate  = Math.floor((new Date(orgToday).getTime() - new Date(inv.due_date + 'T00:00:00').getTime()) / 86400000)
      const amount    = `${Number(inv.amount).toLocaleString()} ${inv.currency ?? 'OMR'}`
      const unitLabel = `${unit?.properties?.name ?? ''} — Unit ${unit?.unit_number ?? ''}`

      // Accumulate for owner summary
      const orgId = inv.organization_id as string
      if (!overdueByOrg.has(orgId)) overdueByOrg.set(orgId, [])
      overdueByOrg.get(orgId)!.push({ tenant: tenant?.full_name ?? 'Unknown Tenant', unit: unitLabel, amount, daysLate })

      if (tenant?.email) {

        const html = emailHtml('#dc2626', 'Overdue Rent Notice', `
          <div style="font-size:15px;color:#334155;line-height:1.8">
            Dear ${tenant.full_name},<br><br>
            Your rent payment of <strong>${amount}</strong> for <strong>${unitLabel}</strong>
            was due on <strong style="color:#dc2626">${fmtDate(inv.due_date)}</strong>
            and is now <strong style="color:#dc2626">${daysLate} day${daysLate !== 1 ? 's' : ''} overdue</strong>.<br><br>
            Please log in to make your payment as soon as possible to avoid penalties.
          </div>
          <div style="margin-top:24px">
            <a href="${APP_URL}/dashboard/tenant/invoices"
               style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
              Pay Now
            </a>
          </div>`)

        try {
          await resend.emails.send({
            from: 'GetSuitel <noreply@getsuitel.com>',
            to:   [tenant.email],
            subject: `Rent overdue by ${daysLate} day${daysLate !== 1 ? 's' : ''} — ${unit?.unit_number}`,
            html,
          })
          emailsSent++
        } catch (e) {
          errors.push(`Overdue email to ${tenant.email}: ${e}`)
        }
      }
    } catch (e) {
      errors.push(`Invoice ${inv.id}: ${e}`)
    }
  }

  // ── 2b. Owner overdue summary — one email per org listing all newly-overdue invoices ──
  for (const [overdueOrgId, items] of overdueByOrg) {
    try {
      const { data: ownerData } = await admin
        .from('organizations')
        .select('name, profiles:owner_id(full_name, email)')
        .eq('id', overdueOrgId)
        .single()

      const owner   = ownerData?.profiles as { full_name: string; email: string } | null
      const orgName = (ownerData?.name as string) ?? 'Your Organization'

      if (!owner?.email) continue

      const rows = items.map(item => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px">${item.tenant}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b">${item.unit}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#dc2626">${item.amount}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#dc2626">${item.daysLate}d late</td>
        </tr>`).join('')

      const html = emailHtml('#dc2626', 'Overdue Rent Alert', `
        <div style="font-size:15px;color:#334155;line-height:1.8">
          Dear ${owner.full_name},<br><br>
          <strong>${items.length} rent invoice${items.length !== 1 ? 's' : ''}</strong> in <strong>${orgName}</strong>
          have just been marked overdue. A payment reminder has been sent to each tenant,
          but these accounts need your attention.
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#fef2f2">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Tenant</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Unit</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Amount</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Overdue</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:24px">
          <a href="${APP_URL}/dashboard/owner/invoices"
             style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
            View Overdue Invoices
          </a>
        </div>`)

      try {
        await resend.emails.send({
          from: 'GetSuitel <notices@getsuitel.com>',
          to:   [owner.email],
          subject: `${items.length} overdue rent invoice${items.length !== 1 ? 's' : ''} — ${orgName}`,
          html,
        })
        emailsSent++
      } catch (e) {
        errors.push(`Owner overdue summary to ${owner.email}: ${e}`)
      }
    } catch (e) {
      errors.push(`Owner overdue summary for org ${overdueOrgId}: ${e}`)
    }
  }

  // ── 3. Expire contracts past their end_date ───────────────────────────────
  const { data: expiredContracts } = await admin
    .from('contracts')
    .select(`
      id, organization_id, end_date,
      tenants(full_name, email),
      units(unit_number, properties(name)),
      profiles:organization_id(full_name, email)
    `)
    .eq('status', 'active')
    .in('organization_id', eligibleOrgIds)

  for (const contract of expiredContracts ?? []) {
    try {
      const orgTz = orgTzMap.get(contract.organization_id as string) ?? 'UTC'
      const { todayStr: orgToday } = getOrgLocalDate(orgTz)
      // Only expire if past end_date in org-local time
      if (orgToday <= contract.end_date) continue

      await admin.from('contracts').update({ status: 'expired' }).eq('id', contract.id)
      contractsExpired++

      const tenant = contract.tenants as { full_name: string; email: string | null } | null
      const unit   = contract.units   as { unit_number: string; properties?: { name: string } | null } | null
      const unitLabel = `${unit?.properties?.name ?? ''} — Unit ${unit?.unit_number ?? ''}`

      // Notify owner
      const { data: ownerProfile } = await admin
        .from('organizations')
        .select('profiles:owner_id(full_name, email)')
        .eq('id', contract.organization_id)
        .single()
      const owner = (ownerProfile?.profiles as { full_name: string; email: string } | null)

      if (owner?.email) {
        const html = emailHtml('#7c3aed', 'Contract Expired', `
          <div style="font-size:15px;color:#334155;line-height:1.8">
            Dear ${owner.full_name},<br><br>
            The rental contract for <strong>${tenant?.full_name ?? 'your tenant'}</strong>
            in <strong>${unitLabel}</strong> has expired on
            <strong style="color:#7c3aed">${fmtDate(contract.end_date)}</strong>.<br><br>
            The contract has been automatically marked as <strong>Expired</strong>.
            Please log in to renew it or mark the unit as vacant.
          </div>
          <div style="margin-top:24px">
            <a href="${APP_URL}/dashboard/owner/contracts"
               style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
              View Contracts
            </a>
          </div>`)

        try {
          await resend.emails.send({
            from: 'GetSuitel <notices@getsuitel.com>',
            to: [owner.email],
            subject: `Contract expired — ${tenant?.full_name} · ${unit?.unit_number}`,
            html,
          })
          emailsSent++
        } catch (e) {
          errors.push(`Expiry email to ${owner.email}: ${e}`)
        }
      }
    } catch (e) {
      errors.push(`Contract expiry ${contract.id}: ${e}`)
    }
  }

  // ── 4. Last-cheque alert ─────────────────────────────────────────────────
  // For each active contract, count cheques with status='pending' (not yet deposited).
  // If exactly 1 remains and we haven't alerted in the past 30 days, send alerts.

  let chequeAlertsSent = 0

  const { data: activeContracts } = await admin
    .from('contracts')
    .select(`
      id, organization_id, tenant_id, unit_id,
      last_cheque_alert_sent_at,
      tenants(full_name, email),
      units(unit_number, properties(name))
    `)
    .eq('status', 'active')
    .in('organization_id', eligibleOrgIds)

  // Collect per-org alerts to send one consolidated owner email
  type ChequeAlertItem = { tenant: string; unit: string; tenantEmail: string | null; contractId: string }
  const chequeAlertsByOrg = new Map<string, ChequeAlertItem[]>()

  for (const contract of activeContracts ?? []) {
    try {
      // Skip if alerted within 30 days
      if (contract.last_cheque_alert_sent_at) {
        const daysSince = (Date.now() - new Date(contract.last_cheque_alert_sent_at).getTime()) / 86400000
        if (daysSince < 30) continue
      }

      // Count remaining pending cheques for this contract
      const { count } = await admin
        .from('cheques')
        .select('id', { count: 'exact', head: true })
        .eq('contract_id', contract.id)
        .eq('status', 'pending')

      if ((count ?? 0) !== 1) continue

      const tenant = contract.tenants as { full_name: string; email: string | null } | null
      const unit   = contract.units   as { unit_number: string; properties?: { name: string } | null } | null
      const unitLabel = `${unit?.properties?.name ?? ''} — Unit ${unit?.unit_number ?? ''}`

      const orgId = contract.organization_id as string
      if (!chequeAlertsByOrg.has(orgId)) chequeAlertsByOrg.set(orgId, [])
      chequeAlertsByOrg.get(orgId)!.push({
        tenant:       tenant?.full_name ?? 'Unknown Tenant',
        unit:         unitLabel,
        tenantEmail:  tenant?.email ?? null,
        contractId:   contract.id as string,
      })
    } catch (e) {
      errors.push(`Cheque alert check for contract ${contract.id}: ${e}`)
    }
  }

  // Send tenant emails + owner consolidated email per org
  for (const [alertOrgId, items] of chequeAlertsByOrg) {
    try {
      // Fetch owner
      const { data: ownerData } = await admin
        .from('organizations')
        .select('name, profiles:owner_id(full_name, email)')
        .eq('id', alertOrgId)
        .single()

      const owner   = ownerData?.profiles as { full_name: string; email: string } | null
      const orgName = (ownerData?.name as string) ?? 'Your Organization'

      // Send tenant emails
      for (const item of items) {
        if (item.tenantEmail) {
          const tenantHtml = emailHtml('#1B3A6B', 'Cheque Submission Reminder', `
            <div style="font-size:15px;color:#334155;line-height:1.8">
              Dear ${item.tenant},<br><br>
              This is a reminder that your property manager has recorded
              <strong style="color:#dc2626">only 1 post-dated cheque remaining</strong>
              for your unit <strong>${item.unit}</strong>.<br><br>
              Please submit new post-dated cheques to your property owner/manager
              at your earliest convenience to ensure uninterrupted tenancy.
            </div>
            <div style="margin-top:24px">
              <a href="${APP_URL}/dashboard/tenant/invoices"
                 style="display:inline-block;background:#1B3A6B;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
                View My Account
              </a>
            </div>`)
          try {
            await resend.emails.send({
              from:    'GetSuitel <notices@getsuitel.com>',
              to:      [item.tenantEmail],
              subject: `Action Required: Please submit new cheques — ${item.unit}`,
              html:    tenantHtml,
            })
            emailsSent++
          } catch (e) {
            errors.push(`Cheque alert tenant email to ${item.tenantEmail}: ${e}`)
          }
        }

        // Mark alert sent on the contract
        await admin
          .from('contracts')
          .update({ last_cheque_alert_sent_at: new Date().toISOString() })
          .eq('id', item.contractId)

        chequeAlertsSent++
      }

      // Owner consolidated email
      if (owner?.email) {
        const rows = items.map(item => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px">${item.tenant}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b">${item.unit}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#dc2626;font-weight:600">1 cheque left</td>
          </tr>`).join('')

        const ownerHtml = emailHtml('#1B3A6B', 'Cheque Running Low Alert', `
          <div style="font-size:15px;color:#334155;line-height:1.8">
            Dear ${owner.full_name},<br><br>
            The following tenant${items.length !== 1 ? 's have' : ' has'}
            <strong style="color:#dc2626">only 1 post-dated cheque remaining</strong>
            in <strong>${orgName}</strong>.
            A reminder has been sent to each tenant to submit new cheques.
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:#eff6ff">
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Tenant</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Unit</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="margin-top:24px">
            <a href="${APP_URL}/dashboard/owner/cheque-tracker"
               style="display:inline-block;background:#1B3A6B;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
              View Cheque Tracker
            </a>
          </div>`)

        try {
          await resend.emails.send({
            from:    'GetSuitel <notices@getsuitel.com>',
            to:      [owner.email],
            subject: `Cheque alert: ${items.length} tenant${items.length !== 1 ? 's' : ''} with 1 cheque remaining — ${orgName}`,
            html:    ownerHtml,
          })
          emailsSent++
        } catch (e) {
          errors.push(`Cheque alert owner email to ${owner.email}: ${e}`)
        }

        // Create a notice on the owner's notices page
        await admin.from('notices').insert({
          organization_id: alertOrgId,
          title:           `Cheque Alert: ${items.length} tenant${items.length !== 1 ? 's' : ''} with 1 cheque remaining`,
          content:         items.map(i => `• ${i.tenant} — ${i.unit}`).join('\n'),
          type:            'general',
          recipient_type:  'all',
          sent_by:         null,
        })
      }
    } catch (e) {
      errors.push(`Cheque alert for org ${alertOrgId}: ${e}`)
    }
  }

  const _hasErrors = errors.length > 0
  await logCron({
    jobName: 'rent_invoicing',
    status: _hasErrors ? 'partial' : 'success',
    summary: { invoicesCreated, invoicesMarkedOverdue, contractsExpired, chequeAlertsSent, emailsSent, errorCount: errors.length },
    errorMsg: _hasErrors ? errors.join(' | ') : undefined,
    durationMs: Date.now() - _startTime,
  })

  return NextResponse.json({
    ok: true,
    date: runDateStr,
    invoicesCreated,
    invoicesMarkedOverdue,
    contractsExpired,
    chequeAlertsSent,
    emailsSent,
    ...(_hasErrors && { errors }),
  })
}
