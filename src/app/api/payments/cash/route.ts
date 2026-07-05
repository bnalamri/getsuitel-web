import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/payments/cash — owner marks invoice as paid by cash
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invoice_id, notes } = await req.json()
  if (!invoice_id) return NextResponse.json({ error: 'Missing invoice_id' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]

  // Mark invoice paid
  const { data: invoice, error } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_date: today, payment_method: 'cash' })
    .eq('id', invoice_id)
    .select('*, tenants(full_name, email)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insert receipt record for audit trail
  await supabase.from('payment_receipts').insert({
    organization_id: invoice.organization_id,
    invoice_id,
    tenant_id: invoice.tenant_id,
    method: 'cash',
    amount: invoice.amount,
    notes: notes ?? 'Cash payment confirmed by owner',
    status: 'confirmed',
    confirmed_by: user.id,
    confirmed_at: new Date().toISOString(),
  })

  // Notify tenant
  const tenantEmail = invoice.tenants?.email
  const tenantName  = invoice.tenants?.full_name ?? 'Tenant'
  if (tenantEmail) {
    await resend.emails.send({
      from: 'GetSuitel <notices@getsuitel.com>',
      to: [tenantEmail],
      subject: 'Cash Payment Confirmed ✓',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
          <div style="font-size:20px;font-weight:900;color:#1B3A6B">Get<span style="color:#C9931A">Suitel</span></div>
          <h2 style="color:#16a34a;margin-top:24px">Cash Payment Confirmed</h2>
          <p>Dear ${tenantName},</p>
          <p>Your cash payment of <strong>${Number(invoice.amount).toLocaleString()} ${invoice.currency}</strong> has been received and confirmed.</p>
          <p>Your invoice is now marked as paid. Thank you!</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">GetSuitel · Automated notification</p>
        </div>`,
    }).catch(console.error)
  }

  return NextResponse.json(invoice)
}
