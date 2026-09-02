import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['hq_admin', 'hq_finance', 'hq_staff'].includes(profile.role)) return null
  return user
}

// GET — load existing agreement data for branch
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const user = await requireHQ(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('branch_agreements')
    .select('*')
    .eq('branch_id', params.id)
    .maybeSingle()

  return NextResponse.json(data ?? null)
}

// POST — upsert (save draft)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const user = await requireHQ(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { error } = await supabase
    .from('branch_agreements')
    .upsert({
      branch_id: params.id,
      ...body,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'branch_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
