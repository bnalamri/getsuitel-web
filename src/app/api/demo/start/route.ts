import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const redirectTo = new URL('/dashboard/owner', request.url)
  const errorTo = new URL('/?demo_error=1', request.url)

  // Build a response we can attach cookies to before redirecting
  const response = NextResponse.redirect(redirectTo)

  // Create Supabase client that writes session cookies onto the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.DEMO_EMAIL!,
    password: process.env.DEMO_PASSWORD!,
  })

  if (error) {
    console.error('[demo/start] sign-in failed:', error.message)
    return NextResponse.redirect(errorTo)
  }

  return response
}
