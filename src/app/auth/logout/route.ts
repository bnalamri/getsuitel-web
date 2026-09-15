// @ts-nocheck — same @supabase/ssr cookie-adapter typing friction worked
// around in src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  // Forward an optional ?reason= param onto /auth/login so the login page
  // can show *why* the user landed back here instead of silently returning
  // (e.g. dashboard/layout.tsx sends reason=profile_missing when the
  // profile lookup fails — previously this bounced back with no message).
  const reason = new URL(request.url).searchParams.get('reason')
  const loginUrl = new URL('/auth/login', request.url)
  if (reason) loginUrl.searchParams.set('reason', reason)
  // Build the redirect first so we can write cleared cookies onto it
  const response = NextResponse.redirect(loginUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          // Write to both the store AND the outgoing response
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  await supabase.auth.signOut()
  return response
}
