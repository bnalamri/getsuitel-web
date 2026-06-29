import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password',
  '/auth/verify-email', '/auth/reset-password']

// Always let logout through regardless of auth state
const ALWAYS_PUBLIC = ['/auth/logout']

const ROLE_HOME: Record<string, string> = {
  superadmin:  '/dashboard/admin',
  owner:       '/dashboard/owner',
  tenant:      '/dashboard/tenant',
  technician:  '/dashboard/technician',
}

/** Copy Supabase cookies onto any redirect so refreshed tokens are never dropped */
function withSupaCookies(redirect: NextResponse, supabaseResponse: NextResponse): NextResponse {
  supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) => {
    redirect.cookies.set({ name, value, ...opts })
  })
  return redirect
}

export async function middleware(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: no code between createServerClient and getUser()
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isAuthPage = PUBLIC_AUTH_PATHS.includes(path)
  if (ALWAYS_PUBLIC.includes(path)) return supabaseResponse

  // ── Not logged in ───────────────────────────────────────────────────────
  if (!user) {
    if (isAuthPage || path === '/') return supabaseResponse
    if (path.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('next', path)
      return withSupaCookies(NextResponse.redirect(url), supabaseResponse)
    }
    return supabaseResponse
  }

  // ── Logged in ───────────────────────────────────────────────────────────

  // Redirect auth pages → role dashboard (carry cookies so token refresh isn't lost)
  if (isAuthPage) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role ?? 'owner'
    const url = request.nextUrl.clone()
    url.pathname = ROLE_HOME[role] ?? '/dashboard/owner'
    return withSupaCookies(NextResponse.redirect(url), supabaseResponse)
  }

  // Role guard for /dashboard/*
  if (path.startsWith('/dashboard/')) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role ?? 'owner'
    const segment = path.split('/')[2]
    const allowed: Record<string, string[]> = {
      admin:       ['superadmin'],
      owner:       ['superadmin', 'owner'],
      tenant:      ['superadmin', 'tenant'],
      technician:  ['superadmin', 'technician'],
    }
    if (segment && allowed[segment] && !allowed[segment].includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = ROLE_HOME[role] ?? '/dashboard/owner'
      return withSupaCookies(NextResponse.redirect(url), supabaseResponse)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
