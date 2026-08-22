import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend  = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://getsuitel.com'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
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

async function getOrgAndRole(req?: Request) {
  const admin = createAdminClient()

  // Mobile sends Bearer token in Authorization header — validate via admin client
  const authHeader = req?.headers.get('Authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (!user || error) return null
    const { data: profile } = await admin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()
    if (!profile || !['owner', 'property_manager', 'manager', 'financial_manager'].includes(profile.role)) return null
    return profile as { role: string; organization_id: string }
  }

  // Web uses cookie-based session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()
  if (!profile || !['owner', 'property_manager', 'manager', 'financial_manager'].includes(profile.role)) return null
  return profile as { role: string; organization_id: string }
}

// GET /api/utilities  — list utility bills for org
export async function GET(req: Request) {
  const profile = await getOrgAndRole(req)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const unitId      = searchParams.get('unit_id')
  const utilityType = searchParams.get('utility_type')
  const status      = searchParams.get('status')

  const admin = createAdminClient()
  let q = admin
    .from('utility_bills')
    .select(`
      *,
      units(unit_number, properties(id, name)),
      tenants(full_name),
      properties(name)
    `)
    .eq('organization_id', profile.organization_id)
    .order('bill_date', { ascending: false })

  if (unitId)      q = q.eq('unit_id', unitId)
  if (utilityType) q = q.eq('utility_type', utilityType)
  if (status)      q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/utilities  — create utility bill + auto-create invoice or expense
export async function POST(req: Request) {
  const profile = await getOrgAndRole(req)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    utility_scope, property_id,
    unit_id, contract_id, tenant_id, utility_type,
    bill_date, due_date, amount, currency,
    billed_to, meter_from, meter_to, notes,
    consumer_no, meter_number, service_type, recharge_code, tariff_type,
  } = body

  const isGeneral = utility_scope === 'general'
  if (!utility_type || !bill_date || !due_date || !amount || !billed_to) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (isGeneral && !property_id) {
    return NextResponse.json({ error: 'property_id required for general bills' }, { status: 400 })
  }
  if (!isGeneral && !unit_id) {
    return NextResponse.json({ error: 'unit_id required for unit-related bills' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Insert utility bill first
  const { data: bill, error: billErr } = await admin
    .from('utility_bills')
    .insert({
      organization_id: profile.organization_id,
      utility_scope:   utility_scope ?? 'unit',
      property_id:     isGeneral ? (property_id ?? null) : null,
      unit_id:         isGeneral ? null : (unit_id ?? null),
      contract_id:     isGeneral ? null : (contract_id  ?? null),
      tenant_id:       isGeneral ? null : (tenant_id    ?? null),
      utility_type,
      bill_date,
      due_date,
      amount:          Number(amount),
      currency:        currency ?? 'OMR',
      billed_to:       isGeneral ? 'owner' : billed_to,
      meter_from:      meter_from ?? null,
      meter_to:        meter_to   ?? null,
      notes:           notes      ?? null,
      consumer_no:     consumer_no     ?? null,
      meter_number:    meter_number    ?? null,
      service_type:    service_type    ?? null,
      recharge_code:   (service_type === 'prepaid' && recharge_code) ? recharge_code : null,
      tariff_type:     (utility_type !== 'internet' && tariff_type) ? tariff_type : null,
      status:          'pending',
    })
    .select('id')
    .single()

  if (billErr) return NextResponse.json({ error: billErr.message }, { status: 500 })

  const utilityLabel = utility_type === 'water' ? 'Water' : utility_type === 'electricity' ? 'Electricity' : 'Internet'

  if (!isGeneral && billed_to === 'tenant' && tenant_id) {
    // Tenant pays utility company directly — no invoice created in GetSuitel.
    // Just notify the tenant by email so they know the amount and due date.
    try {
      const { data: tenantRow } = await admin
        .from('tenants')
        .select('full_name, email')
        .eq('id', tenant_id)
        .single()

      const { data: unitRow } = await admin
        .from('units')
        .select('unit_number, properties(name)')
        .eq('id', unit_id)
        .single()

      if (tenantRow?.email) {
        const unitLabel = `${(unitRow?.properties as { name: string } | null)?.name ?? ''} — Unit ${unitRow?.unit_number ?? ''}`
        const amountFmt = `${Number(amount).toFixed(3)} ${currency ?? 'OMR'}`
        const extraRows = [
          consumer_no   ? `<tr><td style="color:#64748b;padding:4px 16px 4px 0">Consumer No.</td><td style="font-weight:600">${consumer_no}</td></tr>` : '',
          meter_number  ? `<tr><td style="color:#64748b;padding:4px 16px 4px 0">${utility_type === 'internet' ? 'Phone #' : 'Meter #'}</td><td style="font-weight:600">${meter_number}</td></tr>` : '',
          notes         ? `<tr><td style="color:#64748b;padding:4px 16px 4px 0">Notes</td><td style="font-weight:600">${notes}</td></tr>` : '',
        ].join('')

        const html = emailHtml('#1e40af', `${utilityLabel} Bill Notification`, `
          <div style="font-size:15px;color:#334155;line-height:1.8">
            Dear ${tenantRow.full_name},<br><br>
            A ${utilityLabel.toLowerCase()} bill has been received for your unit.
            Please pay this bill directly to the utility company by the due date.<br><br>
            <table style="font-size:14px;border-collapse:collapse">
              <tr><td style="color:#64748b;padding:4px 16px 4px 0">Type</td><td style="font-weight:600">${utilityLabel}</td></tr>
              <tr><td style="color:#64748b;padding:4px 16px 4px 0">Amount</td><td style="font-weight:600">${amountFmt}</td></tr>
              <tr><td style="color:#64748b;padding:4px 16px 4px 0">Bill Date</td><td style="font-weight:600">${fmtDate(bill_date)}</td></tr>
              <tr><td style="color:#64748b;padding:4px 16px 4px 0">Due Date</td><td style="font-weight:600">${fmtDate(due_date)}</td></tr>
              <tr><td style="color:#64748b;padding:4px 16px 4px 0">Unit</td><td style="font-weight:600">${unitLabel}</td></tr>
              ${extraRows}
            </table>
            <p style="margin-top:16px;font-size:13px;color:#64748b">
              Please pay this amount directly to the utility company.
              If you have any questions, contact your property manager.
            </p>
          </div>`)

        await resend.emails.send({
          from:    'GetSuitel <noreply@getsuitel.com>',
          to:      [tenantRow.email],
          subject: `${utilityLabel} bill — ${amountFmt} due ${fmtDate(due_date)} — ${unitRow?.unit_number ?? ''}`,
          html,
        })
      }
    } catch (_) {
      // Email failure should not block the response
    }

    // Bill stays as 'pending' — a record/tracker for the owner; tenant pays utility company directly
    return NextResponse.json({ ok: true, id: bill.id, action: 'notified' })
  }

  // Owner bill — stays pending until owner marks it paid
  return NextResponse.json({ ok: true, id: bill.id, action: 'pending' })
}

// PATCH /api/utilities  — mark bill as paid (creates expense for owner bills)
export async function PATCH(req: Request) {
  const profile = await getOrgAndRole(req)
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action } = await req.json()
  if (!id || action !== 'mark_paid') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const admin = createAdminClient()

  const { data: bill } = await admin
    .from('utility_bills')
    .select('id, organization_id, billed_to, utility_type, amount, currency, bill_date, unit_id, expense_id, notes')
    .eq('id', id)
    .single()

  if (!bill || bill.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
  }

  const utilityLabel = bill.utility_type === 'water' ? 'Water' : bill.utility_type === 'electricity' ? 'Electricity' : 'Internet'
  let expenseId = bill.expense_id ?? null

  if (bill.billed_to === 'owner' && !expenseId) {
    const today = new Date().toISOString().split('T')[0]
    const { data: exp } = await admin
      .from('expenses')
      .insert({
        organization_id: profile.organization_id,
        category:        'utilities',
        description:     `${utilityLabel} bill${bill.notes ? ` — ${bill.notes}` : ''}`,
        amount:          Number(bill.amount),
        currency:        bill.currency ?? 'OMR',
        date:            today,
      })
      .select('id')
      .single()
    expenseId = exp?.id ?? null
  }

  const { error: updateErr } = await admin
    .from('utility_bills')
    .update({ status: 'paid', expense_id: expenseId })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
