import { Resend } from 'resend'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any

const resend = new Resend(process.env.RESEND_API_KEY)

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

function statusEmailHtml(opts: {
  branchName: string
  status: 'suspended' | 'active'
  actorName: string
}): string {
  const isSuspend = opts.status === 'suspended'
  const accent = isSuspend ? '#D97706' : '#16A34A'
  const accentBg = isSuspend ? '#FFFBEB' : '#F0FDF4'
  const title = isSuspend ? 'Branch Suspended' : 'Branch Reactivated'
  const body = isSuspend
    ? `The <strong>${opts.branchName}</strong> branch has been suspended by ${opts.actorName}. Its superadmin has immediately lost dashboard access, and the branch will not accept new activity until it is reactivated by GetSuitel HQ.`
    : `The <strong>${opts.branchName}</strong> branch has been reactivated by ${opts.actorName}. Its superadmin can now sign in and resume normal operations.`

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:#1B3A6B;padding:28px 32px">
  <div style="font-size:22px;font-weight:900;color:#fff">Get<span style="color:#C9931A">Suitel</span></div>
  <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">Branch Status Notification</div>
</td></tr>
<tr><td style="padding:32px">
  <div style="display:inline-block;background:${accentBg};color:${accent};font-weight:700;font-size:13px;padding:8px 16px;border-radius:999px;margin-bottom:16px">${title}</div>
  <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px">${body}</p>
  <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0">If this wasn't expected, please contact GetSuitel HQ.</p>
</td></tr>
<tr><td style="background:#f8fafc;padding:20px 32px;text-align:center">
  <p style="font-size:11px;color:#94a3b8;margin:0">© ${new Date().getFullYear()} GetSuitel · Automated HQ notification</p>
</td></tr>
</table>
</td></tr>
</table>
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
    supabase.from('profiles').select('email').in('role', ['hq_admin', 'hq_finance']),
  ])

  const recipients = new Set<string>()
  const superadminProfile = Array.isArray(branch?.profiles) ? branch?.profiles[0] : branch?.profiles
  if (superadminProfile?.email) recipients.add(superadminProfile.email)
  ;(hqTeam ?? []).forEach((p: { email: string | null }) => p.email && recipients.add(p.email))

  if (recipients.size === 0) return

  const subject = opts.status === 'suspended'
    ? `Branch Suspended — ${opts.branchName}`
    : `Branch Reactivated — ${opts.branchName}`

  await resend.emails.send({
    from: 'GetSuitel <noreply@getsuitel.com>',
    to: Array.from(recipients),
    subject,
    html: statusEmailHtml({ branchName: opts.branchName, status: opts.status, actorName: opts.actorName || 'GetSuitel HQ' }),
  })
}
