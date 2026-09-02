import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — fetch the active platform-wide announcement (public — any superadmin can read)
export async function GET() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('platform_config')
    .select('announcement_text, announcement_severity')
    .eq('id', 1)
    .single()

  if (!data?.announcement_text) {
    return NextResponse.json({ text: null, severity: 'info' })
  }

  return NextResponse.json({
    text:     data.announcement_text,
    severity: data.announcement_severity ?? 'info',
  })
}

// POST — set or clear the platform-wide announcement (HQ admin only)
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['hq_admin', 'hq_finance'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { text, severity } = body // text: null = clear; text: string = set

  const { error } = await supabase
    .from('platform_config')
    .update({
      announcement_text:     text ?? null,
      announcement_severity: text ? (severity ?? 'info') : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
