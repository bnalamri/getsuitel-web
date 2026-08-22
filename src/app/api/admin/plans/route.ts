import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ── GET all plans (including inactive) — superadmin only ──────────────────
export async function GET() {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles').select('role').single()
  if (profile?.role !== 'superadmin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// ── PATCH — update a plan ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles').select('role').single()
  if (profile?.role !== 'superadmin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...fields } = body

  if (!id) return NextResponse.json({ error: 'Missing plan id' }, { status: 400 })

  // Only allow safe fields to be updated
  const allowed = [
    'name_en','name_ar','desc_en','desc_ar','price_monthly','stripe_price_id',
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

// ── POST — create new plan ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles').select('role').single()
  if (profile?.role !== 'superadmin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('subscription_plans')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
