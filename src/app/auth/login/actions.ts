'use server'

import { createClient } from '@/lib/supabase/server'

const ROLE_HOME: Record<string, string> = {
  hq_admin:          '/hq',
  hq_staff:          '/hq',
  hq_finance:        '/hq',
  superadmin:        '/dashboard/admin',
  owner:             '/dashboard/owner',
  tenant:            '/dashboard/tenant',
  technician:        '/dashboard/technician',
  property_manager:  '/dashboard/owner',
  financial_manager: '/dashboard/owner',
}

// NOTE: this used to call redirect(dest) here. When a Server Action is invoked
// directly from a client onSubmit handler (as login/page.tsx does) rather than
// via a native <form action={fn}>, pairing a cookie write (signInWithPassword)
// with redirect() in the same action call can drop the Set-Cookie header on
// the response Next.js sends back — the session cookie never reaches the
// browser, so the very next request (middleware) sees no user and bounces
// straight back to /auth/login with no visible error. Returning the
// destination and letting the client navigate avoids the clash; the cookie
// is already set on *this* response by the time we return.
export async function signInAction(
  email: string,
  password: string,
  nextPath?: string
): Promise<{ error?: string; dest?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('banned')) {
      return { error: 'This account has been deactivated. Please contact your organization administrator.' }
    }
    return { error: error.message }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session not established. Please try again.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const dest = nextPath || ROLE_HOME[profile?.role ?? 'owner'] || '/dashboard/owner'
  return { dest }
}
