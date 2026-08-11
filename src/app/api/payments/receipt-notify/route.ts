import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/payments/receipt-notify
// Called by mobile after direct payment_receipts insert — sends owner email notification.
// Auth: Bearer token (mobile session JWT)
export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!bearerToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: { user } } = await admin.auth.getUser(bearerToken)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { invoice_id, tenant_id, organization_id, method, receipt_url, amount, currency } = body

  if (!invoice_id || !tenant_id || !organization_id || !method)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  // Fetch org owner email
  const { data: org } = await admin
    .from('organizations')
    .select('name, owner_id, profiles!organizations_owner_id_fkey(email, full_name)')
    .eq('id', organization_id)
    .single()

  const ownerEmail = (org?.profiles as { email?: string } | null)?.email
  if (!ownerEmail) return NextResponse.json({ ok: true, skipped: 'no owner email' })

  // Fetch tenant name
  const { data: tenant } = await admin
    .from('tenants')
    .select('full_name')
    .eq('id', tenant_id)
    .single()
  const tenantName = tenant?.full_name ?? 'Tenant'

  // Fetch invoice details
  const { data: inv } = await admin
    .from('invoices')
    .select('amount, currency, due_date, type')
    .eq('id', invoice_id)
    .single()

  const methodLabel: Record<string, string> = {
    bank_transfer:   'Bank Transfer',
    mobile_transfer: 'Mobile Transfer',
    cash:            'Cash',
    cheque:          'Cheque',
  }

  await resend.emails.send({
    from: 'GetSuitel <notices@getsuitel.com>',
    to: [ownerEmail],
    subject: `Payment Receipt Submitted — ${tenantName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
        <div style="font-size:20px;font-weight:900;color:#1B3A6B">Get<span style="color:#C9931A">Suitel</span></div>
        <h2 style="color:#1B3A6B;margin-top:24px">New Payment Receipt</h2>
        <p><strong>${tenantName}</strong> has submitted a payment receipt for review.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Method</td><td style="font-weight:600">${methodLabel[method] ?? method}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Amount</td><td style="font-weight:600">${Number(inv?.amount ?? amount).toLocaleString()} ${inv?.currency ?? currency ?? 'OMR'}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Invoice</td><td>${inv?.type ?? ''} · Due ${inv?.due_date ?? ''}</td></tr>
        </table>
        ${receipt_url ? `<p><a href="${receipt_url}" style="color:#1B3A6B;font-weight:600">View Transaction Slip</a></p>` : ''}
        <p>Please log in to confirm or reject this payment.</p>
        <a href="https://getsuitel.com/dashboard/owner/payments"
           style="display:inline-block;background:#1B3A6B;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">
          Review Payment
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">GetSuitel · Automated notification</p>
      </div>`,
  }).catch(console.error)

  return NextResponse.json({ ok: true })
}
