import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'hq_admin') return null
  return user
}

// PATCH /api/hq/branches/[id]/status
// body: { status: 'active' | 'suspended' | 'archived' }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  if (!await requireHQ(supabase)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const body = await req.json()
  const { status } = body as { status: string }

  if (!['active', 'suspended', 'archived'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
  }

  // Archive safety check: block if branch still has active orgs
  if (status === 'archived') {
    const { count } = await supabase
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', id)

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `Cannot archive: branch still has ${count} organisation(s). Reassign or remove them first.` },
        { status: 409 }
      )
    }
  }

  const { data, error } = await supabase
    .from('branches')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, display_name, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
