import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'hq_admin') return null
  return user
}

export async function GET() {
  const supabase = await createClient()
  if (!await requireHQ(supabase)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('branches')
    .select('*, profiles!branches_superadmin_id_fkey(full_name, email)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = await requireHQ(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, region, city, status, license_fee_omr, revenue_share_pct, superadmin_id, logo_url, pending_superadmin_email } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })

  // No invite is sent here. A new branch starts locked (pending_agreement)
  // and its superadmin invite is generated + emailed automatically once its
  // franchise agreement is signed — see /api/hq/branches/[id]/agreement
  // sign-off logic. pending_superadmin_email is just saved for that moment.
  const { data, error } = await supabase
    .from('branches')
    .insert({
      name: name.trim(), region, city, status, license_fee_omr, revenue_share_pct,
      superadmin_id, logo_url, pending_superadmin_email: pending_superadmin_email || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ...data, invite_sent: false }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  if (!await requireHQ(supabase)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'Branch ID required' }, { status: 400 })

  const { data, error } = await supabase
    .from('branches')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  if (!await requireHQ(supabase)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Branch ID required' }, { status: 400 })

  // Same guard Archive already enforces — never let a branch with linked
  // orgs disappear. (The DB now also RESTRICTs the agreement/audit-log FKs,
  // so this is defense-in-depth, not the only thing standing in the way.)
  const { count: orgCount } = await supabase
    .from('organizations')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', id)
  if ((orgCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${orgCount} organisation(s) are still linked to this branch. Reassign or remove them first.` },
      { status: 409 },
    )
  }

  const { error } = await supabase.from('branches').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
