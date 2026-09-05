import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Public, unauthenticated endpoint — powers the Region selector on the
// owner sign-up form (no session exists yet at that point in the flow, so
// this can't go through the regular RLS-scoped client). Only exposes the
// handful of fields a prospective owner needs to pick their region; no
// financial or contact data. Only 'active' branches are returned — a
// pending_agreement or suspended/archived branch isn't open for new
// sign-ups yet (see hq_lifecycle_rebuild_pending.sql).
export async function GET() {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('branches')
    .select('id, display_name, city, region')
    .eq('status', 'active')
    .order('city')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
