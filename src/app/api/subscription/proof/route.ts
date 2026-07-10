import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/subscription/proof — owner submits subscription payment proof (multipart/form-data)
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file            = formData.get('file') as File | null
  const organization_id = formData.get('organization_id') as string
  const owner_email     = formData.get('owner_email') as string
  const owner_name      = formData.get('owner_name') as string
  const plan            = formData.get('plan') as string
  const amount          = Number(formData.get('amount') ?? 0)
  const currency        = (formData.get('currency') as string) || 'USD'
  const notes           = (formData.get('notes') as string) || null

  if (!organization_id || !file || !amount)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const admin = createAdminClient()

  // Upload file using admin client — bypasses storage RLS
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${organization_id}/${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)

  const { error: uploadErr } = await admin.storage
    .from('subscription-proofs')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadErr)
    return NextResponse.json({ error: 'File upload failed: ' + uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage
    .from('subscription-proofs')
    .getPublicUrl(path)

  // Insert DB record
  const { data: proof, error } = await admin
    .from('subscription_payment_proofs')
    .insert({ organization_id, owner_email, owner_name, plan, amount, currency, receipt_url: publicUrl, notes })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch org name for email
  const { data: org } = await admin
    .from('organizations')
    .select('name, subscription_plan')
    .eq('id', organization_id)
    .single()

  const orgName   = org?.name ?? 'Unknown Organization'
  const planLabel = org?.subscription_plan ?? plan ?? 'unknown'

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">Subscription Payment Proof Received</div>
</td></tr>
<tr><td style="padding:32px">
  <div style="font-size:15px;color:#334155;line-height:1.8">
    A subscription payment proof has been submitted.<br><br>
    <strong>Organization:</strong> ${orgName}<br>
    <strong>Owner:</strong> ${owner_name} (${owner_email})<br>
    <strong>Plan:</strong> ${planLabel}<br>
    <strong>Amount Paid:</strong> ${amount} ${currency}<br>
    ${notes ? `<strong>Notes:</strong> ${notes}<br>` : ''}
  </div>
  <div style="margin:24px 0">
    <a href="${publicUrl}"
       style="display:inline-block;background:#1B3A6B;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
      View Payment Proof
    </a>
  </div>
  <div style="font-size:13px;color:#64748b">
    Please review and update the subscription status for this organization in the admin dashboard.
  </div>
</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</td></tr>
</table></td></tr></table></body></html>`

  await resend.emails.send({
    from: 'GetSuitel <notices@getsuitel.com>',
    to: ['billing@getsuitel.com'],
    subject: `Subscription Payment Proof — ${orgName} (${planLabel})`,
    html,
  }).catch(console.error)

  return NextResponse.json(proof)
}

// GET /api/subscription/proof — admin fetches all pending proofs
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('subscription_payment_proofs')
    .select('*, organizations(name, subscription_plan, subscription_status)')
    .order('submitted_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/subscription/proof — admin approves proof, activates org subscription
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, org_id, status, duration_months = 1 } = body
  const admin = createAdminClient()

  // Mark proof as reviewed
  const { data, error } = await admin
    .from('subscription_payment_proofs')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Activate the org subscription
  if (org_id && status === 'reviewed') {
    // Calculate new expiry — extend from current expiry if still in future, else from now
    const duration_months_num: number = Number(duration_months) || 1
    const { data: currentOrg } = await admin
      .from('organizations')
      .select('subscription_expires_at')
      .eq('id', org_id)
      .single()

    const base = currentOrg?.subscription_expires_at && new Date(currentOrg.subscription_expires_at) > new Date()
      ? new Date(currentOrg.subscription_expires_at)
      : new Date()
    base.setMonth(base.getMonth() + duration_months_num)
    const subscription_expires_at = base.toISOString()

    await admin
      .from('organizations')
      .update({
        subscription_status: 'active',
        subscription_expires_at,
        subscription_reminder_sent_at: null, // reset reminder for next cycle
      })
      .eq('id', org_id)

    // Fetch org + owner email to send activation confirmation
    const { data: org } = await admin
      .from('organizations')
      .select('name, subscription_plan, profiles!organizations_owner_id_fkey(email, full_name)')
      .eq('id', org_id)
      .single()

    const ownerEmail = (org?.profiles as { email?: string; full_name?: string })?.email
    const ownerName  = (org?.profiles as { email?: string; full_name?: string })?.full_name ?? 'there'
    const orgName    = org?.name ?? ''
    const plan       = org?.subscription_plan ?? ''

    if (ownerEmail) {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">Subscription Activated</div>
</td></tr>
<tr><td style="padding:32px">
  <div style="font-size:15px;color:#334155;line-height:1.8">
    Dear ${ownerName},<br><br>
    Your payment has been received and your <strong>${plan}</strong> subscription for <strong>${orgName}</strong> is now active.
    You have full access to all features included in your plan.
  </div>
  <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 18px;border-radius:8px;margin:24px 0;font-size:14px;color:#166534">
    <strong>Status:</strong> Active &nbsp;·&nbsp; <strong>Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)}<br>
    <strong>Active until:</strong> ${new Date(subscription_expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
  </div>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://getsuitel.com'}/dashboard/owner"
     style="display:inline-block;background:#1B3A6B;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
    Go to Dashboard
  </a>
</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</td></tr>
</table></td></tr></table></body></html>`

      await resend.emails.send({
        from: 'GetSuitel <notices@getsuitel.com>',
        to: [ownerEmail],
        subject: `Your ${plan} subscription is now active — ${orgName}`,
        html,
      }).catch(console.error)
    }
  }

  return NextResponse.json(data)
}
