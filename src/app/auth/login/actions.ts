'use server'

import { cookies, headers } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  DEVICE_COOKIE, checkPassword, findTrustedDevice, createTrustedDevice,
  issueLoginCode, verifyLoginCode, labelFromUserAgent,
} from '@/lib/trustedDevices'

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

type Result = { error?: string; dest?: string; needsCode?: boolean }

function friendly(message: string) {
  return message.toLowerCase().includes('banned')
    ? 'This account has been deactivated. Please contact your organization administrator.'
    : message
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
async function establishSession(email: string, password: string, nextPath?: string): Promise<Result & { userId?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: friendly(error.message) }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session not established. Please try again.' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { dest: nextPath || ROLE_HOME[profile?.role ?? 'owner'] || '/dashboard/owner', userId: user.id }
}

async function profileName(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('full_name').eq('id', userId).maybeSingle()
  return (data?.full_name as string) ?? ''
}

/** Step 1: password. Trusted browser → straight in. New browser → emails a code. */
export async function signInAction(
  email: string, password: string, nextPath?: string, lang: 'en' | 'ar' = 'en'
): Promise<Result> {
  const check = await checkPassword(email, password)
  if (!check.ok) return { error: friendly(check.error) }

  const jar = await cookies()
  const trusted = await findTrustedDevice(check.user.id, jar.get(DEVICE_COOKIE)?.value)
  if (trusted) return await establishSession(email, password, nextPath)

  const err = await issueLoginCode(check.user.id, check.user.email!, await profileName(check.user.id), lang)
  if (err) return { error: err }
  return { needsCode: true }
}

/** Step 2: emailed code (+ optional "trust this browser"). */
export async function verifyCodeAction(
  email: string, password: string, code: string, trust: boolean, nextPath?: string
): Promise<Result> {
  const check = await checkPassword(email, password)
  if (!check.ok) return { error: friendly(check.error) }
  if (!(await verifyLoginCode(check.user.id, code))) {
    return { error: 'That code is incorrect or has expired.' }
  }

  const res = await establishSession(email, password, nextPath)
  if (res.error) return res

  if (trust) {
    const ua = (await headers()).get('user-agent')
    const dev = await createTrustedDevice(check.user.id, 'browser', labelFromUserAgent(ua, 'browser'))
    const jar = await cookies()
    jar.set(DEVICE_COOKIE, dev.token, {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      maxAge: 60 * 60 * 24 * 365 * 10, // stays trusted until removed by the user
    })
  }
  return { dest: res.dest }
}

export async function resendCodeAction(email: string, password: string, lang: 'en' | 'ar' = 'en'): Promise<Result> {
  const check = await checkPassword(email, password)
  if (!check.ok) return { error: friendly(check.error) }
  const err = await issueLoginCode(check.user.id, check.user.email!, await profileName(check.user.id), lang)
  return err ? { error: err } : { needsCode: true }
}
