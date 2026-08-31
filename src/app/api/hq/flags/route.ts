import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — list all feature flags
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('platform_feature_flags')
    .select('*')
    .order('feature_key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — update a flag (global toggle or branch override)
// Body: { feature_key, enabled_globally? } OR { feature_key, branch_id, override }
// override: true | false | null (null = remove override, use global)
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const body = await req.json()
  const { feature_key, enabled_globally, branch_id, override } = body

  if (!feature_key) return NextResponse.json({ error: 'feature_key required' }, { status: 400 })

  // Global toggle
  if (typeof enabled_globally === 'boolean') {
    const { error } = await supabase
      .from('platform_feature_flags')
      .update({ enabled_globally, updated_at: new Date().toISOString() })
      .eq('feature_key', feature_key)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Per-branch override
  if (branch_id !== undefined) {
    // Fetch current overrides first
    const { data: flag, error: fetchErr } = await supabase
      .from('platform_feature_flags')
      .select('branch_overrides')
      .eq('feature_key', feature_key)
      .single()
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    const overrides = (flag?.branch_overrides as Record<string, boolean> | null) ?? {}
    if (override === null || override === undefined) {
      delete overrides[branch_id]
    } else {
      overrides[branch_id] = override
    }

    const { error } = await supabase
      .from('platform_feature_flags')
      .update({ branch_overrides: overrides, updated_at: new Date().toISOString() })
      .eq('feature_key', feature_key)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Provide enabled_globally or branch_id + override' }, { status: 400 })
}
