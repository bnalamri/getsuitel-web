import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// HQ's own "Plans & Pricing" — edits the platform DEFAULT catalogue
// (subscription_plans). This is what /pricing falls back to for any
// branch that hasn't set its own overrides, and what the homepage's
// #pricing section always shows. Branch-specific overrides live in
// branch_subscription_plans and are edited by each branch's superadmin
// via /api/admin/plans instead — see 20260915_branch_pricing_plans.sql.

async function requireHQAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'hq_admin') return null
  return user
}

// ── GET all default plans (including inactive) ────────────────────────────
export async function GET() {
  if (!await requireHQAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// ── PATCH — update a default plan ──────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  if (!await requireHQAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const body = await req.json()
  const { id, ...fields } = body

  if (!id) return NextResponse.json({ error: 'Missing plan id' }, { status: 400 })

  const allowed = [
    'name_en','name_ar','desc_en','desc_ar','price_monthly','currency','stripe_price_id',
    'max_properties','max_units','max_tenants','max_staff','trial_days',
    'features_en','features_ar','is_popular','is_active','sort_order',
  ]
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key]
  }

  const { data, error } = await supabase
    .from('subscription_plans')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── POST — create a new default plan slug ─────────────────────────────────
export async function POST(req: NextRequest) {
  if (!await requireHQAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const body = await req.json()
  const { data, error } = await supabase
    .from('subscription_plans')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
