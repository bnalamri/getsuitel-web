import { Resend } from 'resend'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://getsuitel.com'

// Notifies the branch superadmin + HQ admin/finance team when a branch is
// suspended or reactivated. Deliberately NOT called for 'archived' — by the
// time a branch archives it has zero linked orgs (enforced by the archive
// guard) and is effectively retired, so there's no live superadmin session
// or ongoing operation to alert anyone about.
//
// Called from the single shared status-change route
// (/api/hq/branches/[id]/status) so both web and mobile-triggered status
// changes fire the same email — mobile now routes through this same API
// instead of writing branches.status directly (see hq_branch_detail.dart).
//
// Uses the same formal "GetSuitel HQ" letter format as
// /api/hq/billing/remind (dark header, "Dear {name}," salutation, a details
// table, automated-notice footer) rather than the marketing-style card used
// for invites — this is an operational HQ notice, not an onboarding email.
// Sent as two separate, personally-addressed emails (superadmin vs HQ team)
// instead of one blanket "to" list, so each can be addressed by name.

function statusEmailHtml(opts: {
  branchName: string
  status: 'suspended' | 'active'
  actorName: string
  recipientName: string
  ctaUrl: string
  ctaLabel: string
  audience: 'superadmin' | 'hq'
}): string {
  const isSuspend = opts.status === 'suspended'
  const title = isSuspend ? 'Branch Suspended' : 'Branch Reactivated'

  const body = opts.audience === 'superadmin'
    ? (isSuspend
        ? `This is to formally notify you that the <strong>${opts.branchName}</strong> branch has been suspended by ${opts.actorName}. Your dashboard access has been revoked with immediate effect and will remain unavailable until the branch is reactivated by GetSuitel HQ.`
        : `This is to formally notify you that the <strong>${opts.branchName}</strong> branch has been reactivated by ${opts.actorName}. Your dashboard access has been restored and normal operations may resume.`)
    : (isSuspend
        ? `This is to notify you that the <strong>${opts.branchName}</strong> branch has been suspended by ${opts.actorName}. Its superadmin has lost dashboard access until the branch is reactivated.`
        : `This is to notify you that the <strong>${opts.branchName}</strong> branch has been reactivated by ${opts.actorName}. Its superadmin's dashboard access has been restored.`)

  const dateStr = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;color:#111827">
  <div style="background:#1F2937;padding:24px 32px;border-radius:12px 12px 0 0">
    <p style="color:#FBBF24;font-size:13px;font-weight:600;letter-spacing:0.05em;margin:0 0 4px">GETSUITEL HQ</p>
    <h1 style="color:#fff;font-size:22px;margin:0">${title}</h1>
  </div>
  <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px">
    <p style="margin:0 0 16px">Dear ${opts.recipientName},</p>
    <p style="margin:0 0 16px">${body}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
      <tr style="background:#F9FAFB">
        <td style="padding:10px 14px;border:1px solid #E5E7EB;font-weight:600">Branch</td>
        <td style="padding:10px 14px;border:1px solid #E5E7EB">${opts.branchName}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;border:1px solid #E5E7EB;font-weight:600">Status</td>
        <td style="padding:10px 14px;border:1px solid #E5E7EB;font-weight:700;color:${isSuspend ? '#DC2626' : '#16A34A'}">${isSuspend ? 'Suspended' : 'Active'}</td>
      </tr>
      <tr style="background:#F9FAFB">
        <td style="padding:10px 14px;border:1px solid #E5E7EB;font-weight:600">Actioned By</td>
        <td style="padding:10px 14px;border:1px solid #E5E7EB">${opts.actorName}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;border:1px solid #E5E7EB;font-weight:600">Date</td>
        <td style="padding:10px 14px;border:1px solid #E5E7EB">${dateStr}</td>
      </tr>
    </table>
    <a href="${opts.ctaUrl}" style="display:inline-block;background:#F59E0B;color:#111827;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px">${opts.ctaLabel} →</a>
    <p style="margin:32px 0 0;font-size:13px;color:#9CA3AF;border-top:1px solid #F3F4F6;padding-top:20px">This is an automated notice from GetSuitel HQ. For queries, contact your HQ admin.</p>
  </div>
</div>
</body></html>`
}

export async function notifyBranchStatusChange(
  supabase: AnySupabaseClient,
  opts: { branchId: string; branchName: string; status: 'suspended' | 'active'; actorName?: string | null },
): Promise<void> {
  const [{ data: branch }, { data: hqTeam }] = await Promise.all([
    supabase
      .from('branches')
      .select('superadmin_id, profiles!branches_superadmin_id_fkey(email, full_name)')
      .eq('id', opts.branchId)
      .maybeSingle(),
    supabase.from('profiles').select('email, full_name').in('role', ['hq_admin', 'hq_finance']),
  ])

  const actorName = opts.actorName || 'GetSuitel HQ'
  const subject = opts.status === 'suspended'
    ? `Branch Suspended — ${opts.branchName}`
    : `Branch Reactivated — ${opts.branchName}`

  const superadminProfile = Array.isArray(branch?.profiles) ? branch?.profiles[0] : branch?.profiles
  const sends: Promise<unknown>[] = []

  if (superadminProfile?.email) {
    sends.push(resend.emails.send({
      from: 'GetSuitel HQ <noreply@getsuitel.com>',
      to: superadminProfile.email,
      subject,
      html: statusEmailHtml({
        branchName: opts.branchName,
        status: opts.status,
        actorName,
        recipientName: superadminProfile.full_name || 'Branch Admin',
        ctaUrl: `${APP_URL}/dashboard/admin`,
        ctaLabel: 'Open Dashboard',
        audience: 'superadmin',
      }),
    }))
  }

  const hqEmails = (hqTeam ?? [])
    .map((p: { email: string | null }) => p.email)
    .filter((e: string | null): e is string => !!e)

  if (hqEmails.length > 0) {
    sends.push(resend.emails.send({
      from: 'GetSuitel HQ <noreply@getsuitel.com>',
      to: hqEmails,
      subject,
      html: statusEmailHtml({
        branchName: opts.branchName,
        status: opts.status,
        actorName,
        recipientName: 'GetSuitel HQ Team',
        ctaUrl: `${APP_URL}/hq/branches`,
        ctaLabel: 'View Branch',
        audience: 'hq',
      }),
    }))
  }

  if (sends.length === 0) return
  await Promise.allSettled(sends)
}
