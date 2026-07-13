import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

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
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1–12
  const monthStr = String(month).padStart(2, '0')
  const monthStart = `${year}-${monthStr}-01`
  const monthEnd   = `${year}-${monthStr}-28` // cap at 28 (UI enforces max=28)

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
    .neq('payment_method', 'cheque') // cheque payments tracked separately in Cheque Tracker

  if (contractsErr) {
    return NextResponse.json({ error: contractsErr.message }, { status: 500 })
  }

  for (const contract of contracts ?? []) {
    try {
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

  const { data: sentPastDue } = await admin
    .from('invoices')
    .select(`
      id, organization_id, amount, currency, due_date,
      tenants(full_name, email),
      units(unit_number, properties(name))
    `)
    .eq('status', 'sent')
    .lt('due_date', todayStr)

  for (const inv of sentPastDue ?? []) {
    try {
      await admin.from('invoices').update({ status: 'overdue' }).eq('id', inv.id)
      invoicesMarkedOverdue++

      const tenant = inv.tenants as { full_name: string; email: string | null } | null
      const unit   = inv.units   as { unit_number: string; properties?: { name: string } | null } | null

      if (tenant?.email) {
        const daysLate  = Math.floor((now.getTime() - new Date(inv.due_date + 'T00:00:00').getTime()) / 86400000)
        const amount    = `${Number(inv.amount).toLocaleString()} ${inv.currency ?? 'OMR'}`
        const unitLabel = `${unit?.properties?.name ?? ''} — Unit ${unit?.unit_number ?? ''}`

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
    .lt('end_date', todayStr)

  for (const contract of expiredContracts ?? []) {
    try {
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

  return NextResponse.json({
    ok: true,
    date: todayStr,
    invoicesCreated,
    invoicesMarkedOverdue,
    contractsExpired,
    emailsSent,
    ...(errors.length > 0 && { errors }),
  })
}
