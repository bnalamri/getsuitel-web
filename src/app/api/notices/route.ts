import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  const allowedRoles = ['owner', 'manager', 'property_manager', 'financial_manager']
  if (!profile || !allowedRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!profile.organization_id) {
    return NextResponse.json({ error: 'No organization linked' }, { status: 400 })
  }

  const body = await req.json()
  const { rows } = body as {
    rows: {
      tenant_id?: string | null
      technician_id?: string | null
      recipient_type?: 'tenant' | 'technician'
      type: string
      subject: string
      body: string
      attachment_url: string | null
    }[]
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('notices').insert(
    rows.map(r => ({
      organization_id: profile.organization_id,
      type: r.type,
      subject: r.subject,
      body: r.body,
      attachment_url: r.attachment_url ?? null,
      recipient_type: r.recipient_type ?? 'tenant',
      tenant_id: r.tenant_id ?? null,
      technician_id: r.technician_id ?? null,
    }))
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
