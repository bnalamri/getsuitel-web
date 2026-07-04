import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { orderId, nextStatus } = await req.json()
  if (!orderId || !nextStatus) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Verify the caller is the assigned technician
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Confirm this request belongs to this technician
  const { data: request } = await admin
    .from('maintenance_requests')
    .select('id, technician_id')
    .eq('id', orderId)
    .single()

  if (!request || request.technician_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updates: Record<string, unknown> = { status: nextStatus }
  if (nextStatus === 'completed') updates.completed_at = new Date().toISOString()

  const { error } = await admin
    .from('maintenance_requests')
    .update(updates)
    .eq('id', orderId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
