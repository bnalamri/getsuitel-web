import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// ─── GET — list all platform notices (superadmin only) ───────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: notices, error } = await admin
    .from('platform_notices')
    .select('*, organizations(name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notices })
}

// ─── POST — send a platform notice (superadmin only) ─────────────────────────
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, body, targetOrgId } = await req.json() as {
    title: string
    body: string
    targetOrgId: string | null  // null = all owners
  }

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Insert platform notice
  const { data: notice, error: noticeErr } = await admin
    .from('platform_notices')
    .insert({ title, body, sent_by: user.id, target_org_id: targetOrgId ?? null })
    .select()
    .single()

  if (noticeErr) return NextResponse.json({ error: noticeErr.message }, { status: 500 })

  // 2. Fetch recipient owner emails
  let ownersQuery = admin
    .from('profiles')
    .select('id, organization_id, organizations(id, name)')
    .eq('role', 'owner')

  if (targetOrgId) {
    ownersQuery = ownersQuery.eq('organization_id', targetOrgId)
  }

  const { data: ownerProfiles } = await ownersQuery

  // Get emails from auth.users via admin
  const ownerIds = (ownerProfiles ?? []).map(p => p.id)
  const emailPromises = ownerIds.map(async (ownerId) => {
    const { data: authUser } = await admin.auth.admin.getUserById(ownerId)
    return authUser?.user?.email ?? null
  })
  const emails = (await Promise.all(emailPromises)).filter(Boolean) as string[]

  // 3. Send branded email to each owner
  const emailHtml = buildNoticeEmail(title, body)

  await Promise.allSettled(
    emails.map(email =>
      resend.emails.send({
        from: 'GetSuitel <notices@getsuitel.com>',
        to: [email],
        subject: `[GetSuitel] ${title}`,
        html: emailHtml,
      })
    )
  )

  return NextResponse.json({ ok: true, noticeId: notice.id, recipientCount: emails.length })
}

// ─── Branded email template ───────────────────────────────────────────────────
function buildNoticeEmail(title: string, body: string): string {
  const escapedBody = body.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">Platform Notice</div>
</td></tr>
<tr><td style="padding:32px">
  <div style="font-size:15px;color:#334155;line-height:1.8;white-space:pre-line">${escapedBody}</div>
</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
  <div style="font-size:12px;color:#94a3b8">GetSuitel · Smart Real Estate Management · getsuitel.com</div>
</td></tr>
</table></td></tr></table>
</body></html>`
}
