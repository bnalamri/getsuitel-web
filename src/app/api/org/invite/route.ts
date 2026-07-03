import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Validates an invite code (first 8 chars of org ID) and returns org info
// Uses service-role client — orgs are not publicly readable via RLS
export async function POST(req: Request) {
  const { code } = await req.json()
  if (!code || code.length < 6) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })

  const supabase = createAdminClient()
  // UUID columns need a text cast for pattern matching in PostgREST
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name')
    .filter('id::text', 'ilike', `${code.toLowerCase()}%`)
    .limit(1)

  if (error) return NextResponse.json({ error: 'Lookup failed', detail: error.message }, { status: 500 })

  if (!orgs || orgs.length === 0) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  return NextResponse.json({ org: orgs[0] })
}
