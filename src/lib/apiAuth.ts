// @ts-nocheck
import { createAdminClient, createClient } from '@/lib/supabase/server'

/**
 * Resolves the calling user's id from either a browser session (cookie auth,
 * web) or a Supabase access token in an Authorization: Bearer header (mobile
 * — the app has no cookie jar, so it sends its session token directly). Same
 * dual-auth pattern already used by /api/maintenance/markpaid; pulled out
 * here so every new route that needs it doesn't re-implement it.
 */
export async function getAuthedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const admin = createAdminClient()
    const { data: { user } } = await admin.auth.getUser(authHeader.slice(7))
    return user?.id ?? null
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}
