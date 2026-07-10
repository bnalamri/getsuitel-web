import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Public endpoint — validates a staff invitation token
// Uses admin client to bypass RLS (token is secret, so this is safe)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')?.trim()

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('staff_invitations')
    .select('id, role, email, expires_at, accepted_at, organizations(id, name)')
    .eq('token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Invalid invitation link' }, { status: 404 })
  }

  if (data.accepted_at) {
    return NextResponse.json({ error: 'This invitation has already been used' }, { status: 410 })
  }

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
  }

  const org = data.organizations as { id: string; name: string } | null

  return NextResponse.json({
    valid: true,
    role: data.role,
    email: data.email,
    orgId: org?.id,
    orgName: org?.name,
    invitationId: data.id,
  })
}
