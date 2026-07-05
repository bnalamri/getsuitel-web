import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// PATCH /api/payments/cheques/[id] — update status (deposited/cleared/bounced/cancelled)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const body = await req.json()
  const { status, deposited_date, cleared_date, bounce_reason, notes } = body

  const updates: Record<string, unknown> = { status }
  if (deposited_date) updates.deposited_date = deposited_date
  if (cleared_date)   updates.cleared_date   = cleared_date
  if (bounce_reason)  updates.bounce_reason  = bounce_reason
  if (notes !== undefined) updates.notes = notes

  const { data: cheque, error } = await supabase
    .from('cheques')
    .update(updates)
    .eq('id', params.id)
    .select('*, tenants(full_name, email), invoices(id, amount, currency)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If cleared → mark linked invoice as paid
  if (status === 'cleared' && cheque.invoice_id) {
    await supabase.from('invoices').update({
      status: 'paid',
      paid_date: cleared_date ?? new Date().toISOString().split('T')[0],
      payment_method: 'cheque',
    }).eq('id', cheque.invoice_id)
  }

  // If bounced → notify tenant by email
  if (status === 'bounced' && cheque.tenants?.email) {
    const tenantEmail = cheque.tenants.email
    const tenantName  = cheque.tenants.full_name
    await resend.emails.send({
      from: 'GetSuitel <notices@getsuitel.com>',
      to: [tenantEmail],
      subject: 'Cheque Returned — Action Required',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
          <div style="font-size:20px;font-weight:900;color:#1B3A6B">Get<span style="color:#C9931A">Suitel</span></div>
          <h2 style="color:#B91C1C;margin-top:24px">Cheque Returned</h2>
          <p>Dear ${tenantName},</p>
          <p>Your cheque <strong>#${cheque.cheque_number}</strong> (${Number(cheque.amount).toLocaleString()} ${cheque.invoices?.currency ?? 'OMR'})
          has been returned by the bank.</p>
          ${bounce_reason ? `<p><strong>Reason:</strong> ${bounce_reason}</p>` : ''}
          <p>Please contact your property manager immediately to arrange an alternative payment.</p>
          <div style="background:#fef2f2;border-left:4px solid #B91C1C;padding:12px 16px;border-radius:4px;margin:20px 0">
            <strong>Amount due:</strong> ${Number(cheque.amount).toLocaleString()} ${cheque.invoices?.currency ?? 'OMR'}
          </div>
          <p style="color:#64748b;font-size:13px">GetSuitel · Automated notification</p>
        </div>`,
    }).catch(console.error)
  }

  return NextResponse.json(cheque)
}

// DELETE /api/payments/cheques/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { error } = await supabase.from('cheques').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
