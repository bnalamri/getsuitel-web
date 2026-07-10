import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// PATCH /api/payments/cheques/[id] — update status (deposited/cleared/bounced/cancelled)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const body = await req.json()
  const { status, deposited_date, cleared_date, bounce_reason, return_reason, notes } = body

  const updates: Record<string, unknown> = { status }
  if (deposited_date) updates.deposited_date = deposited_date
  if (cleared_date)   updates.cleared_date   = cleared_date
  if (bounce_reason)  updates.bounce_reason  = bounce_reason
  if (return_reason)  updates.bounce_reason  = return_reason  // reuse same column
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
    const currency    = cheque.invoices?.currency ?? 'OMR'
    const amount      = `${Number(cheque.amount).toLocaleString()} ${currency}`
    const body = `
      <div style="font-size:15px;color:#334155;line-height:1.8">
        Dear ${tenantName},<br><br>
        Your cheque <strong>#${cheque.cheque_number}</strong> for <strong>${amount}</strong>
        has been returned by the bank.${bounce_reason ? `<br><br><strong>Reason:</strong> ${bounce_reason}` : ''}<br><br>
        Please contact your property manager immediately to arrange an alternative payment.
      </div>
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 18px;border-radius:8px;margin:24px 0;font-size:14px;color:#991b1b">
        <strong>Amount due:</strong> ${amount}
      </div>
      <div style="margin-top:8px">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getsuitel.com'}/dashboard/tenant/invoices"
           style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
          View My Invoices
        </a>
      </div>`
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#dc2626;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">Cheque Returned — Action Required</div>
</td></tr>
<tr><td style="padding:32px">${body}</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</td></tr>
</table></td></tr></table></body></html>`
    await resend.emails.send({
      from: 'GetSuitel <notices@getsuitel.com>',
      to: [tenantEmail],
      subject: `Cheque Returned — Action Required (#${cheque.cheque_number})`,
      html,
    }).catch(console.error)
  }

  // If returned (technical) → notify tenant with softer message
  if (status === 'returned' && cheque.tenants?.email) {
    const tenantEmail = cheque.tenants.email
    const tenantName  = cheque.tenants.full_name
    const currency    = cheque.invoices?.currency ?? 'OMR'
    const amount      = `${Number(cheque.amount).toLocaleString()} ${currency}`
    const body = `
      <div style="font-size:15px;color:#334155;line-height:1.8">
        Dear ${tenantName},<br><br>
        Your cheque <strong>#${cheque.cheque_number}</strong> for <strong>${amount}</strong>
        was returned by the bank for a technical correction.
        ${return_reason ? `<br><br><strong>Reason:</strong> ${return_reason}` : ''}<br><br>
        Please provide a corrected cheque to your property manager at your earliest convenience.
      </div>
      <div style="background:#fff7ed;border-left:4px solid #ea580c;padding:14px 18px;border-radius:8px;margin:24px 0;font-size:14px;color:#9a3412">
        <strong>Action required:</strong> Please submit a corrected cheque for ${amount}
      </div>`
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#ea580c;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">Cheque Returned for Correction</div>
</td></tr>
<tr><td style="padding:32px">${body}</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</td></tr>
</table></td></tr></table></body></html>`
    await resend.emails.send({
      from: 'GetSuitel <notices@getsuitel.com>',
      to: [tenantEmail],
      subject: `Cheque Correction Needed — #${cheque.cheque_number}`,
      html,
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
