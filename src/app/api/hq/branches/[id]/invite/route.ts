import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'hq_admin') return null
  return user
}

function generateCode(): string {
  // 8 uppercase alphanumeric chars, no ambiguous O/0/I/1 pairs, formatted XXXX-XXXX
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const buf = new Uint8Array(8)
  crypto.getRandomValues(buf)
  const raw = Array.from(buf).map(b => chars[b % chars.length]).join('')
  return `${raw.slice(0, 4)}-${raw.slice(4)}`
}

// POST /api/hq/branches/[id]/invite — generate (or rotate) invite code for a branch
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: branchId } = await params
  const supabase = await createClient()
  const user = await requireHQ(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify branch exists
  const { data: branch } = await supabase
    .from('branches')
    .select('id, display_name')
    .eq('id', branchId)
    .single()
  if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 })

  // Expire any existing unused codes for this branch
  await supabase
    .from('invite_codes')
    .update({ expires_at: new Date().toISOString() })
    .eq('branch_id', branchId)
    .is('used_by', null)

  // Create new code
  const code = generateCode()
  const { data: invite, error } = await supabase
    .from('invite_codes')
    .insert({
      code,
      branch_id: branchId,
      created_by: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    code: invite.code,
    branch_name: branch.display_name,
    expires_at: invite.expires_at,
    invite_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/invite?code=${invite.code}`,
  }, { status: 201 })
}
