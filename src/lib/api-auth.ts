import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Verifies the request is from an authenticated superadmin.
 * Returns { user, profile } on success, or a NextResponse error to return immediately.
 */
export async function requireSuperadmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'superadmin') {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true, userId: user.id }
}

/**
 * Same check as requireSuperadmin(), but also accepts an `Authorization:
 * Bearer <access token>` header — mobile has no cookie jar, so it
 * authenticates that way instead (same pattern as /api/payments/receipt-notify).
 * Web requests (no header) fall through to the cookie-based check.
 */
export async function requireSuperadminEither(req: Request): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const authHeader = req.headers.get('Authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (bearerToken) {
    const admin = createAdminClient()
    const { data: { user } } = await admin.auth.getUser(bearerToken)
    if (!user) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'superadmin') return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    return { ok: true, userId: user.id }
  }
  return requireSuperadmin()
}
