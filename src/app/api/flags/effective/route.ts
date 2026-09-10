import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAuthedUserId } from '@/lib/apiAuth'
import { getEnabledFeatures } from '@/lib/featureFlags'

// GET /api/flags/effective?keys=bank_transfer,cheque_payments,maintenance
// Returns the live, whole-cascade effective value for each requested flag
// for the calling user's own organization — the single endpoint mobile (and
// any web client component that can't run a server-side check itself) calls
// to find out whether a feature is actually on, not just what an admin
// toggle displays. Works for any authenticated role; returns {} for keys
// when the user has no organization_id (e.g. HQ/Super Admin staff).
export async function GET(req: Request) {
  const userId = await getAuthedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const keysParam = searchParams.get('keys')
  if (!keysParam) return NextResponse.json({ error: 'keys query param required' }, { status: 400 })
  const keys = keysParam.split(',').map(k => k.trim()).filter(Boolean)
  if (keys.length === 0) return NextResponse.json({ error: 'keys query param required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('organization_id').eq('id', userId).single()
  const orgId = (profile?.organization_id as string | undefined) ?? null

  const flags = await getEnabledFeatures(keys, orgId)
  return NextResponse.json({ flags })
}
