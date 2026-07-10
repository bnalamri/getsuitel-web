import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// GET /api/payments/receipts?orgId=xxx
export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const orgId    = searchParams.get('orgId')
  const tenantId = searchParams.get('tenantId')

  let query = supabase
    .from('payment_receipts')
    .select('*, invoices(amount, currency, due_date, type), tenants(full_name)')
    .order('submitted_at', { ascending: false })

  if (orgId)    query = query.eq('organization_id', orgId)
  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/payments/receipts — tenant submits receipt (JSON or multipart/form-data)
export async function POST(req: Request) {
  const supabase = await createClient()
  const contentType = req.headers.get('content-type') ?? ''

  let invoice_id: string, tenant_id: string, organization_id: string, method: string
  let receipt_url: string | undefined
  let amount: number | undefined
  let notes: string | undefined
  let file: File | null = null

  if (contentType.includes('multipart/form-data')) {
    const fd = await req.formData()
    invoice_id      = fd.get('invoice_id') as string
    tenant_id       = fd.get('tenant_id') as string
    organization_id = fd.get('organization_id') as string
    method          = fd.get('method') as string
    notes           = (fd.get('notes') as string) || undefined
    amount          = Number(fd.get('amount')) || undefined
    file            = fd.get('file') as File | null
  } else {
    const body = await req.json()
    ;({ invoice_id, tenant_id, organization_id, method, receipt_url, amount, notes } = body)
  }

  if (!invoice_id || !tenant_id || !organization_id || !method)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  // Upload file using admin client if provided (bypasses storage RLS)
  if (file && file.size > 0) {
    const admin = createAdminClient()
    const ext    = file.name.split('.').pop() ?? 'jpg'
    const path   = `${organization_id}/${invoice_id}/${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    const { error: uploadErr } = await admin.storage
      .from('receipts')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (!uploadErr) {
      const { data: { publicUrl } } = admin.storage.from('receipts').getPublicUrl(path)
      receipt_url = publicUrl
    }
  }

  const { data: receipt, error } = await supabase
    .from('payment_receipts')
    .insert({ invoice_id, tenant_id, organization_id, method, receipt_url, amount, notes })
    .select('*, invoices(amount, currency, due_date, type), tenants(full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify owner by email
  const { data: org } = await supabase
    .from('organizations')
    .select('name, owner_id, profiles!organizations_owner_id_fkey(email, full_name)')
    .eq('id', organization_id)
    .single()

  const ownerEmail = (org?.profiles as { email?: string })?.email
  const tenantName = receipt.tenants?.full_name ?? 'Tenant'
  const inv        = receipt.invoices
  const methodLabel: Record<string, string> = {
    bank_transfer: 'Bank Transfer', mobile_transfer: 'Mobile Transfer', cash: 'Cash',
  }

  if (ownerEmail) {
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
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Amount</td><td style="font-weight:600">${Number(inv?.amount ?? amount).toLocaleString()} ${inv?.currency ?? 'OMR'}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Invoice</td><td>${inv?.type ?? ''} · Due ${inv?.due_date ?? ''}</td></tr>
          </table>
          ${receipt_url ? `<p><a href="${receipt_url}" style="color:#1B3A6B;font-weight:600">View Transaction Slip</a></p>` : ''}
          <p>Please log in to confirm or reject this payment.</p>
          <a href="https://getsuitel.com/dashboard/owner/payments" style="display:inline-block;background:#1B3A6B;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">Review Payment</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">GetSuitel · Automated notification</p>
        </div>`,
    }).catch(console.error)
  }

  return NextResponse.json(receipt)
}
