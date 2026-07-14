import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function buildNoticeEmail(subject: string, body: string, attachmentUrl: string | null, type: string): string {
  const subtitle = type === 'late_payment' ? 'Late Payment Notice' : 'Property Notice'
  const escapedBody = body.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">${subtitle}</div>
</td></tr>
<tr><td style="padding:32px">
  <div style="font-size:15px;color:#334155;line-height:1.8;white-space:pre-line">${escapedBody}</div>
  ${attachmentUrl ? `<div style="margin-top:24px">
    <a href="${attachmentUrl}" style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;color:#1B3A6B;text-decoration:none;font-size:13px;font-weight:600;padding:10px 16px;border-radius:8px">📎 View Attachment</a>
  </div>` : ''}
</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</td></tr>
</table></td></tr></table>
</body></html>`
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  const allowedRoles = ['owner', 'manager', 'property_manager', 'financial_manager']
  if (!profile || !allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!profile.organization_id) {
    return NextResponse.json({ error: 'No organization linked' }, { status: 400 })
  }

  const body = await req.json()
  const { rows } = body as {
    rows: {
      tenant_id?: string | null
      technician_id?: string | null
      recipient_type?: 'tenant' | 'technician'
      type: string
      subject: string
      body: string
      attachment_url: string | null
    }[]
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Insert notices
  const { error } = await admin.from('notices').insert(
    rows.map(r => ({
      organization_id: profile.organization_id,
      type: r.type,
      subject: r.subject,
      body: r.body,
      attachment_url: r.attachment_url ?? null,
      recipient_type: r.recipient_type ?? 'tenant',
      tenant_id: r.tenant_id ?? null,
      technician_id: r.technician_id ?? null,
    }))
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build email list — deduplicate by email address
  const firstRow = rows[0]
  const subject = firstRow.subject
  const noticeBody = firstRow.body
  const attachmentUrl = firstRow.attachment_url ?? null
  const noticeType = firstRow.type
  const recipientType = firstRow.recipient_type ?? 'tenant'

  const emailMap = new Map<string, string>() // email → name

  if (recipientType === 'tenant') {
    const tenantIds = [...new Set(rows.map(r => r.tenant_id).filter(Boolean) as string[])]
    if (tenantIds.length > 0) {
      const { data: tenantRows } = await admin
        .from('tenants')
        .select('id, full_name, email')
        .in('id', tenantIds)
      for (const t of tenantRows ?? []) {
        if (t.email) emailMap.set(t.email, t.full_name)
      }
    }
  } else {
    // technicians — get emails from auth
    const techIds = [...new Set(rows.map(r => r.technician_id).filter(Boolean) as string[])]
    if (techIds.length > 0) {
      const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const techIdSet = new Set(techIds)
      for (const u of listData?.users ?? []) {
        if (techIdSet.has(u.id) && u.email) {
          emailMap.set(u.email, u.user_metadata?.full_name ?? u.email)
        }
      }
    }
  }

  const emails = [...emailMap.keys()]
  if (emails.length > 0) {
    const html = buildNoticeEmail(subject, noticeBody, attachmentUrl, noticeType)
    const { error: batchErr } = await resend.batch.send(
      emails.map(email => ({
        from: 'GetSuitel <noreply@getsuitel.com>',
        to: [email],
        subject,
        html,
      }))
    )
    if (batchErr) console.error('[notices] batch send error:', JSON.stringify(batchErr))
    else console.log(`[notices] batch sent ok to ${emails.length} recipients`)
  }

  return NextResponse.json({ ok: true })
}
