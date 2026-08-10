/**
 * POST /api/admin/trigger-cron
 * Manually triggers a cron job. Supports both cookie session (web) and
 * Bearer token (mobile) for superadmin auth.
 * Body: { job: 'rent_invoicing' | 'org_snapshot' | 'org_purge' }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const JOB_PATHS: Record<string, string> = {
  rent_invoicing: '/api/cron/rent',
  org_snapshot:   '/api/cron/snapshot',
  org_purge:      '/api/cron/purge',
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
  const path = job ? JOB_PATHS[job] : null
  if (!path) return NextResponse.json({ error: `Unknown job: ${job}` }, { status: 400 })

  // Call the cron internally using the CRON_SECRET so timezone filter is bypassed
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getsuitel.com'
  const cronSecret = process.env.CRON_SECRET

  try {
    const cronRes = await fetch(`${baseUrl}${path}`, {
      headers: cronSecret ? { authorization: `Bearer ${cronSecret}` } : {},
    })
    const data = await cronRes.json().catch(() => ({}))
    return NextResponse.json({ ok: cronRes.ok, status: cronRes.status, ...data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
