import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadminEither } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/superadmin/billing/receipt — SuperAdmin submits a payment receipt
// for their branch's monthly license fee + revenue share (multipart/form-data
// or JSON: { billing_id, method, notes?, receipt_url? })
export async function POST(req: Request) {
  const auth = await requireSuperadminEither(req)
  if (!auth.ok) return auth.response
  const userId = auth.userId

  const contentType = req.headers.get('content-type') ?? ''
  let billing_id: string, method: string, notes: string | undefined, receipt_url: string | undefined
  let file: File | null = null

  if (contentType.includes('multipart/form-data')) {
    const fd = await req.formData()
    billing_id = fd.get('billing_id') as string
    method      = fd.get('method') as string
    notes       = (fd.get('notes') as string) || undefined
    file        = fd.get('file') as File | null
  } else {
    const body = await req.json()
    ;({ billing_id, method, notes, receipt_url } = body)
  }

  if (!billing_id || !method) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const admin = createAdminClient()

  // Verify this billing row belongs to a branch this superadmin actually runs
  const { data: billing, error: billingErr } = await admin
    .from('branch_billing')
    .select('id, branch_id, status, share_amount_omr, license_fee_omr, month, notes, branches!inner(id, display_name, superadmin_id)')
    .eq('id', billing_id)
    .single()

  if (billingErr || !billing) return NextResponse.json({ error: 'Billing record not found' }, { status: 404 })
  const branch = billing.branches as unknown as { id: string; display_name: string; superadmin_id: string | null }
  if (branch.superadmin_id !== userId) return NextResponse.json({ error: 'Not your branch' }, { status: 403 })
  if (billing.status === 'paid') return NextResponse.json({ error: 'This bill is already marked paid' }, { status: 400 })

  // Upload file via admin client (bypasses storage RLS), same bucket as tenant receipts
  if (file && file.size > 0) {
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `branch-billing/${branch.id}/${billing_id}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadErr } = await admin.storage.from('receipts').upload(path, buffer, { contentType: file.type, upsert: true })
    if (!uploadErr) {
      const { data: { publicUrl } } = admin.storage.from('receipts').getPublicUrl(path)
      receipt_url = publicUrl
    }
  }

  const { data: updated, error } = await admin
    .from('branch_billing')
    .update({
      status:        'submitted',
      payment_method: method,
      receipt_url,
      submitted_at:  new Date().toISOString(),
      submitted_by:  userId,
      notes:         notes ?? billing.notes,
      rejection_reason: null,
    })
    .eq('id', billing_id)
    .select('id, status, month, share_amount_omr, license_fee_omr')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify HQ finance/admin
  const { data: config } = await admin.from('platform_config').select('hq_contact_email').eq('id', 1).single()
  const totalDue = (Number(billing.share_amount_omr) + Number(billing.license_fee_omr)).toFixed(3)
  const month = new Date(billing.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  if (config?.hq_contact_email) {
    await resend.emails.send({
      from: 'GetSuitel HQ <no-reply@getsuitel.com>',
      to: config.hq_contact_email,
      subject: `Branch Payment Receipt Submitted — ${branch.display_name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px">
          <h2 style="color:#1F2937">Branch Payment Receipt Submitted</h2>
          <p><strong>${branch.display_name}</strong> submitted a receipt for <strong>${month}</strong>.</p>
          <p>Method: ${method} &middot; Amount due: ${totalDue} OMR</p>
          ${receipt_url ? `<p><a href="${receipt_url}">View Receipt</a></p>` : ''}
          <p>Please review and confirm in the HQ Billing dashboard.</p>
        </div>`,
    }).catch(console.error)
  }

  return NextResponse.json(updated)
}
