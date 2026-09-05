// @ts-nocheck
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Next.js App Router patches the global `fetch` and, by default, caches GET
// requests indefinitely (Data Cache) unless told not to. supabase-js makes
// its REST calls with plain `fetch`, so every .select() from a server
// component/route was silently eligible for that cache — this is what made
// a value changed on mobile (or by any other client) appear stale on the
// web dashboard until something else happened to bust the cache. Passing a
// custom fetch that forces `cache: 'no-store'` makes every Supabase read
// always hit Postgrest fresh, matching what a live admin dashboard needs.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' })

/** Service-role client — bypasses RLS. Use only in server-side API routes. */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: noStoreFetch },
    }
  )
}

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* Server component — ignore */ }
        },
      },
      global: { fetch: noStoreFetch },
    }
  )
}