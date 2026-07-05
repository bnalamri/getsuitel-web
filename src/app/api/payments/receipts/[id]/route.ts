import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// PATCH /api/payments/receipts/[id] — owner confirms or rejects
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, rejection_reason } = body  // status: 'confirmed' | 'rejected'

  const updates: Record<string, unknown> = {
    status,
    confirmed_by: user.id,
    confirmed_at: new Date().toISOString(),
  }
  if (rejection_reason) updates.rejection_reason = rejection_reason

  const { data: receipt, error } = await supabase
    .from('payment_receipts')
    .update(updates)
    .eq('id', params.id)
    .select('*, invoices(id, amount, currency, due_date, type), tenants(full_name, email)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If confirmed → mark invoice as paid
  if (status === 'confirmed' && receipt.invoice_id) {
    await supabase.from('invoices').update({
      status: 'paid',
      paid_date: new Date().toISOString().split('T')[0],
      payment_method: receipt.method,
    }).eq('id', receipt.invoice_id)
  }

  // Email tenant
  const tenantEmail = receipt.tenants?.email
  const tenantName  = receipt.tenants?.full_name ?? 'Tenant'
  const inv         = receipt.invoices

  if (tenantEmail) {
    const confirmed = status === 'confirmed'
    await resend.emails.send({
      from: 'GetSuitel <notices@getsuitel.com>',
      to: [tenantEmail],
      subject: confirmed ? 'Payment Confirmed ✓' : 'Payment Receipt Rejected',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
          <div style="font-size:20px;font-weight:900;color:#1B3A6B">Get<span style="color:#C9931A">Suitel</span></div>
          <h2 style="color:${confirmed ? '#16a34a' : '#B91C1C'};margin-top:24px">
            ${confirmed ? 'Payment Confirmed' : 'Receipt Not Accepted'}
          </h2>
          <p>Dear ${tenantName},</p>
          ${confirmed
            ? `<p>Your payment of <strong>${Number(inv?.amount).toLocaleString()} ${inv?.currency ?? 'OMR'}</strong> has been confirmed. Your invoice is now marked as paid.</p>`
            : `<p>Your payment receipt for <strong>${Number(inv?.amount).toLocaleString()} ${inv?.currency ?? 'OMR'}</strong> was not accepted.</p>
               ${rejection_reason ? `<p><strong>Reason:</strong> ${rejection_reason}</p>` : ''}
               <p>Please resubmit with a clear receipt or contact your property manager.</p>`
          }
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">GetSuitel · Automated notification</p>
        </div>`,
    }).catch(console.error)
  }

  return NextResponse.json(receipt)
}
