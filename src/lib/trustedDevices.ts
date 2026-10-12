// @ts-nocheck
import crypto from 'crypto'
import { Resend } from 'resend'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/server'
import { loginCodeEmailHtml, loginCodeEmailSubject } from '@/lib/email/login-code-email'

export const DEVICE_COOKIE = 'gs_td'
const CODE_TTL_MIN = 10
const MAX_ATTEMPTS = 5
const MAX_CODES_PER_15_MIN = 5

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')
export const randomToken = () => crypto.randomBytes(32).toString('base64url')

/** Checks email+password against Supabase WITHOUT touching any cookies. */
type CheckResult =
  | { ok: false; error: string; user?: undefined; session?: undefined }
  | { ok: true; error?: undefined; user: import('@supabase/supabase-js').User; session: import('@supabase/supabase-js').Session }

export async function checkPassword(email: string, password: string): Promise<CheckResult> {
  const anon = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error || !data.user || !data.session) return { ok: false, error: error?.message ?? 'Invalid credentials' }
  return { ok: true, user: data.user, session: data.session }
}

export function labelFromUserAgent(ua: string | null | undefined, kind: 'browser' | 'phone') {
  const s = ua ?? ''
  if (kind === 'phone') return 'Android phone'
  const os = /Windows/i.test(s) ? 'Windows' : /Android/i.test(s) ? 'Android' : /iPhone|iPad|iOS/i.test(s) ? 'iOS'
    : /Mac OS/i.test(s) ? 'macOS' : /Linux/i.test(s) ? 'Linux' : 'Unknown OS'
  const br = /Edg\//i.test(s) ? 'Edge' : /Chrome\//i.test(s) ? 'Chrome' : /Firefox\//i.test(s) ? 'Firefox'
    : /Safari\//i.test(s) ? 'Safari' : 'Browser'
  return `${br} on ${os}`
}

export async function findTrustedDevice(userId: string, token: string | null | undefined) {
  if (!token) return null
  const admin = createAdminClient()
  const { data } = await admin.from('trusted_devices').select('id')
    .eq('user_id', userId).eq('token_hash', sha256(token)).maybeSingle()
  if (data) await admin.from('trusted_devices').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  return data ?? null
}

export async function createTrustedDevice(userId: string, kind: 'browser' | 'phone', label: string) {
  const admin = createAdminClient()
  const token = randomToken()
  const { data, error } = await admin.from('trusted_devices')
    .insert({ user_id: userId, kind, label, token_hash: sha256(token) }).select('id').single()
  if (error) throw new Error(error.message)
  return { id: data.id as string, token }
}

/** Creates + emails a 6-digit code. Returns an error string on failure. */
export async function issueLoginCode(userId: string, email: string, name: string, lang: 'en' | 'ar' = 'en') {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 15 * 60_000).toISOString()
  const { count } = await admin.from('login_codes').select('id', { count: 'exact', head: true })
    .eq('user_id', userId).gte('created_at', since)
  if ((count ?? 0) >= MAX_CODES_PER_15_MIN) return 'Too many codes requested. Please wait a few minutes and try again.'

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  await admin.from('login_codes').update({ used_at: new Date().toISOString() }).eq('user_id', userId).is('used_at', null)
  const { error } = await admin.from('login_codes').insert({
    user_id: userId, code_hash: sha256(`${userId}:${code}`),
    expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
  })
  if (error) return 'Could not create a sign-in code. Please try again.'

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: mailErr } = await resend.emails.send({
      from: 'GetSuitel <noreply@getsuitel.com>',
      to: email,
      subject: loginCodeEmailSubject(lang),
      html: loginCodeEmailHtml(name, code, CODE_TTL_MIN, lang),
    })
    if (mailErr) return 'Could not send the sign-in code email. Please try again.'
  } catch {
    return 'Could not send the sign-in code email. Please try again.'
  }
  return null
}

/** Returns true if the code is valid (and consumes it). */
export async function verifyLoginCode(userId: string, code: string) {
  const admin = createAdminClient()
  const { data: row } = await admin.from('login_codes').select('*')
    .eq('user_id', userId).is('used_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!row) return false
  if (new Date(row.expires_at) < new Date() || row.attempts >= MAX_ATTEMPTS) return false
  await admin.from('login_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id)
  const a = Buffer.from(sha256(`${userId}:${code.trim()}`))
  const b = Buffer.from(row.code_hash)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  await admin.from('login_codes').update({ used_at: new Date().toISOString() }).eq('id', row.id)
  return true
}

/** Mints a normal Supabase session for a user without a password. */
export async function mintSession(email: string) {
  const admin = createAdminClient()
  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !link?.properties?.hashed_token) return null
  const anon = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data, error: vErr } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: link.properties.hashed_token })
  if (vErr || !data.session) return null
  return data.session
}
