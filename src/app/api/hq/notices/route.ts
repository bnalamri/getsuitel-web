import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — list all HQ notices (HQ admin)
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hq_notices')
    .select('*, profiles ( full_name )')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — create a new HQ notice
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, body: noticeBody, priority, target_branch_ids, expires_at } = body

  if (!title?.trim() || !noticeBody?.trim())
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })

  const { data, error } = await supabase.from('hq_notices').insert({
    title: title.trim(),
    body: noticeBody.trim(),
    priority: priority ?? 'normal',
    target_branch_ids: target_branch_ids?.length ? target_branch_ids : null,
    expires_at: expires_at || null,
    created_by: user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE — remove a notice by id (?id=uuid)
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('hq_notices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
