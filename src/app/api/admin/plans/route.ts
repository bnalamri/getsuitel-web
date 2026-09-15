import { createClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'

// Branch-scoped Plans & Pricing for a superadmin. Each branch can
// override HQ's default plans (subscription_plans) on a per-slug basis by
// writing a row into branch_subscription_plans — see
// 20260915_branch_pricing_plans.sql for why this replaced the old global
// table that every superadmin shared.
//
// GET returns all HQ default slugs merged with this branch's own
// overrides where they exist, each row flagged `is_customized` so the UI
// can show "inherited from HQ" vs "your own price." Only override rows
// (is_customized) can be edited or reset here — the HQ default catalogue
// itself is edited by HQ via /api/hq/plans.

async function getMyBranchId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('branches').select('id').eq('superadmin_id', userId).single()
  return data?.id as string | undefined
}

export async function GET() {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const supabase = await createClient()
  const branchId = await getMyBranchId(supabase, auth.userId)
  if (!branchId) return NextResponse.json({ error: 'No branch assigned to this account' }, { status: 404 })

  const [{ data: defaults, error: defErr }, { data: overrides, error: ovErr }] = await Promise.all([
    supabase.from('subscription_plans').select('*').order('sort_order'),
    supabase.from('branch_subscription_plans').select('*').eq('branch_id', branchId),
  ])

  if (defErr) return NextResponse.json({ error: defErr.message }, { status: 500 })
  if (ovErr) return NextResponse.json({ error: ovErr.message }, { status: 500 })

  const overrideMap = new Map((overrides ?? []).map(o => [o.slug, o]))

  const merged = (defaults ?? []).map(def => {
    const ov = overrideMap.get(def.slug)
    if (ov) {
      return { ...ov, is_customized: true, default_price: def.price_monthly, default_currency: def.currency }
    }
    return {
      ...def,
      id: null, // no override row yet — Save will create one
      is_customized: false,
      default_price: def.price_monthly,
      default_currency: def.currency,
    }
  })

  return NextResponse.json(merged)
}

// ── PATCH — create/update this branch's override for a plan slug ─────────
export async function PATCH(req: NextRequest) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const supabase = await createClient()
  const branchId = await getMyBranchId(supabase, auth.userId)
  if (!branchId) return NextResponse.json({ error: 'No branch assigned to this account' }, { status: 404 })

  const body = await req.json()
  const { slug, ...fields } = body
  if (!slug) return NextResponse.json({ error: 'Missing plan slug' }, { status: 400 })

  const allowed = [
    'name_en','name_ar','desc_en','desc_ar','price_monthly','currency','stripe_price_id',
    'max_properties','max_units','max_tenants','max_staff','trial_days',
    'features_en','features_ar','is_popular','is_active','sort_order',
  ]
  const row: Record<string, unknown> = { branch_id: branchId, slug }
  for (const key of allowed) {
    if (key in fields) row[key] = fields[key]
  }

  const { data, error } = await supabase
    .from('branch_subscription_plans')
    .upsert(row, { onConflict: 'branch_id,slug' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, is_customized: true })
}

// ── DELETE — reset a plan slug back to the HQ default for this branch ────
export async function DELETE(req: NextRequest) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const supabase = await createClient()
  const branchId = await getMyBranchId(supabase, auth.userId)
  if (!branchId) return NextResponse.json({ error: 'No branch assigned to this account' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'Missing plan slug' }, { status: 400 })

  const { error } = await supabase
    .from('branch_subscription_plans')
    .delete()
    .eq('branch_id', branchId)
    .eq('slug', slug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
