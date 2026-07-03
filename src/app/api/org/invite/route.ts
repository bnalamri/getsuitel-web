import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Validates an invite code (first 8 chars of org UUID, no dashes) and returns org info
// Uses service-role client — orgs are not publicly readable via RLS
export async function POST(req: Request) {
  const { code } = await req.json()
  if (!code || code.length < 6) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })

  const normalizedCode = code.trim().toUpperCase()

  const supabase = createAdminClient()
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name')

  if (error) return NextResponse.json({ error: 'Lookup failed', detail: error.message }, { status: 500 })

  // Match by first 8 chars of org UUID (no dashes) — same formula as the settings page
  const match = orgs?.find(o =>
    o.id.replace(/-/g, '').substring(0, 8).toUpperCase() === normalizedCode
  )

  if (!match) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  return NextResponse.json({ org: match })
}
