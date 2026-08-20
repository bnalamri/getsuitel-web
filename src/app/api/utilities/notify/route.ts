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

// POST /api/utilities/notify
// Called by mobile after it creates a utility invoice directly in Supabase.
// Body: { tenant_id, unit_id, amount, currency, due_date, utility_type }
export async function POST(req: Request) {
  // Auth: accept Bearer token (mobile) or cookie session (web)
  const authHeader = req.headers.get('authorization') ?? ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (bearerToken) {
    // Verify Bearer token via Supabase admin
    const admin = createAdminClient()
    const { data: { user }, error } = await admin.auth.getUser(bearerToken)
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  } else {
    // Fall back to cookie session (web calls)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tenant_id, unit_id, amount, currency, due_date, utility_type } = await req.json()
  if (!tenant_id || !unit_id || !amount || !due_date || !utility_type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = createAdminClient()  // admin client for DB queries (separate from auth check above)

  const { data: tenant } = await admin
    .from('tenants')
    .select('full_name, email')
    .eq('id', tenant_id)
    .single()

  const { data: unit } = await admin
    .from('units')
    .select('unit_number, properties(name)')
    .eq('id', unit_id)
    .single()

  if (!tenant?.email) {
    return NextResponse.json({ ok: true, skipped: 'no tenant email' })
  }

  const utilLabel  = utility_type === 'water' ? 'Water'
                   : utility_type === 'electricity' ? 'Electricity' : 'Internet'
  const unitLabel  = `${(unit?.properties as { name: string } | null)?.name ?? ''} — Unit ${unit?.unit_number ?? ''}`
  const amountFmt  = `${Number(amount).toFixed(3)} ${currency ?? 'OMR'}`

  const html = emailHtml('#1e40af', 'Utility Bill Invoice', `
    <div style="font-size:15px;color:#334155;line-height:1.8">
      Dear ${tenant.full_name},<br><br>
      A new utility bill has been issued for your unit.<br><br>
      <table style="font-size:14px;border-collapse:collapse">
        <tr><td style="color:#64748b;padding:4px 16px 4px 0">Type</td><td style="font-weight:600">${utilLabel}</td></tr>
        <tr><td style="color:#64748b;padding:4px 16px 4px 0">Amount</td><td style="font-weight:600">${amountFmt}</td></tr>
        <tr><td style="color:#64748b;padding:4px 16px 4px 0">Due Date</td><td style="font-weight:600">${fmtDate(due_date)}</td></tr>
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
      from:    'GetSuitel <noreply@getsuitel.com>',
      to:      [tenant.email],
      subject: `${utilLabel} bill — ${amountFmt} due ${fmtDate(due_date)} — ${unit?.unit_number ?? ''}`,
      html,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
