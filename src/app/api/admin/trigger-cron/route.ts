/**
 * POST /api/admin/trigger-cron
 * Manually triggers a cron job by directly calling the handler — no HTTP,
 * so Vercel header-stripping is not an issue.
 * Supports cookie session (web) and Bearer token (mobile) for superadmin auth.
 * Body: { job: 'rent_invoicing' | 'org_snapshot' | 'org_purge' }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

// Import handlers directly to avoid server-to-server HTTP (Vercel strips custom headers)
import { GET as rentHandler }     from '@/app/api/cron/rent/route'
import { GET as snapshotHandler } from '@/app/api/cron/snapshot/route'
import { GET as purgeHandler }    from '@/app/api/admin/purge/route'

const HANDLERS: Record<string, (req: Request) => Promise<Response>> = {
  rent_invoicing: rentHandler,
  org_snapshot:   snapshotHandler,
  org_purge:      purgeHandler,
}

export async function POST(req: NextRequest) {
  const admin = createAdminClient()

  // Resolve user — Bearer token (mobile) OR cookie session (web)
  let userId: string | null = null
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '').trim()

  if (bearer) {
    const { data: { user } } = await admin.auth.getUser(bearer)
    userId = user?.id ?? null
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  }

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Must be superadmin
  const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).single()
  if (profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { job } = body as { job?: string }
  const handler = job ? HANDLERS[job] : null
  if (!handler) return NextResponse.json({ error: `Unknown job: ${job}` }, { status: 400 })

  // Build a fake request: inject the service role key so isCron=true,
  // and ?force=true to bypass the org-timezone midnight filter
  const baseUrl    = process.env.NEXT_PUBLIC_APP_URL || 'https://getsuitel.com'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const fakeReq    = new Request(`${baseUrl}/api/cron/${job}?force=true`, {
    headers: { authorization: `Bearer ${serviceKey}` },
  })

  try {
    const res  = await handler(fakeReq)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return NextResponse.json({ ok: false, ...data }, { status: res.status })
    return NextResponse.json({ ok: true, ...data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
