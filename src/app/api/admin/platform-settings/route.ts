import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.from('platform_settings').select('key, value')
    if (error) return NextResponse.json({ default_currency: 'OMR' })
    const settings: Record<string, string> = {}
    data?.forEach(r => { settings[r.key] = r.value })
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ default_currency: 'OMR' })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const admin = createAdminClient()
    const updates = Object.entries(body).map(([key, value]) => ({
      key, value: String(value), updated_at: new Date().toISOString(),
    }))
    const { error } = await admin.from('platform_settings').upsert(updates, { onConflict: 'key' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
