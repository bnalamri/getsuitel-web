import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createAdminClient()
  const { data: invitation } = await admin
    .from('hq_invitations')
    .select('email, expires_at, accepted_at, invited_role')
    .eq('token', token)
    .single()

  if (!invitation) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
  if (invitation.accepted_at) return NextResponse.json({ error: 'Already used' }, { status: 410 })
  if (new Date(invitation.expires_at) < new Date()) return NextResponse.json({ error: 'Expired' }, { status: 410 })

  return NextResponse.json({ email: invitation.email, invited_role: invitation.invited_role ?? 'hq_staff' })
}
