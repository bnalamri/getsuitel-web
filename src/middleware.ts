import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password',
  '/auth/verify-email', '/auth/reset-password', '/auth/invite']

// Always let logout through regardless of auth state
const ALWAYS_PUBLIC = ['/auth/logout', '/auth/suspended']

const ROLE_HOME: Record<string, string> = {
  hq_admin:          '/hq',
  superadmin:        '/dashboard/admin',
  owner:             '/dashboard/owner',
  tenant:            '/dashboard/tenant',
  technician:        '/dashboard/technician',
  property_manager:  '/dashboard/owner',
  financial_manager: '/dashboard/owner',
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
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            // Make session-only cookies — browser discards them on close
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { maxAge, expires, ...sessionOptions } = options as CookieOptions & { maxAge?: number; expires?: Date }
            supabaseResponse.cookies.set(name, value, sessionOptions)
          })
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

  // Determine if this path needs a role check at all
  const needsRole = isAuthPage || path === '/dashboard' || path.startsWith('/hq') || path.startsWith('/dashboard/')
  if (!needsRole) return supabaseResponse

  // Fetch role ONCE — reused by all guards below
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? 'owner'

  // Branch suspension check — redirect suspended branch superadmins
  if (role === 'superadmin' && path.startsWith('/dashboard/admin')) {
    const { data: branch } = await supabase
      .from('branches')
      .select('status')
      .eq('superadmin_id', user.id)
      .single()
    if (branch?.status === 'suspended') {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/suspended'
      return withSupaCookies(NextResponse.redirect(url), supabaseResponse)
    }
  }

  // Redirect auth pages → role dashboard
  if (isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = ROLE_HOME[role] ?? '/dashboard/owner'
    return withSupaCookies(NextResponse.redirect(url), supabaseResponse)
  }

  // Redirect /dashboard → role home
  if (path === '/dashboard') {
    const url = request.nextUrl.clone()
    url.pathname = ROLE_HOME[role] ?? '/dashboard/owner'
    return withSupaCookies(NextResponse.redirect(url), supabaseResponse)
  }

  // Guard /hq/* — hq_admin only
  if (path.startsWith('/hq')) {
    if (role !== 'hq_admin') {
      const url = request.nextUrl.clone()
      url.pathname = ROLE_HOME[role] ?? '/dashboard/owner'
      return withSupaCookies(NextResponse.redirect(url), supabaseResponse)
    }
    return supabaseResponse
  }

  // Role guard for /dashboard/*
  if (path.startsWith('/dashboard/')) {
    // hq_admin doesn't belong in /dashboard — send them home
    if (role === 'hq_admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/hq'
      return withSupaCookies(NextResponse.redirect(url), supabaseResponse)
    }
    const segment = path.split('/')[2]
    const allowed: Record<string, string[]> = {
      admin:       ['superadmin'],
      owner:       ['superadmin', 'owner', 'property_manager', 'financial_manager'],
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
