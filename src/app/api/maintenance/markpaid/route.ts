import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { requestId } = await req.json()
  if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })

  // Support cookie auth (web) and Bearer token auth (mobile)
  const admin = createAdminClient()
  let userId: string | null = null
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const { data: { user: mobileUser } } = await admin.auth.getUser(authHeader.slice(7))
    userId = mobileUser?.id ?? null
  } else {
    const supabase = await createClient()
    const { data: { user: webUser } } = await supabase.auth.getUser()
    userId = webUser?.id ?? null
  }
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin
    .from('profiles').select('role, organization_id').eq('id', userId).single()

  if (!profile || !['owner', 'property_manager', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Mark invoice as paid
  const { error } = await admin
    .from('maintenance_requests')
    .update({ invoice_paid: true })
    .eq('id', requestId)
    .eq('organization_id', profile.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-record as a property expense
  try {
    const { data: request } = await admin
      .from('maintenance_requests')
      .select('final_amount, unit_id, title, charge_notes, organization_id')
      .eq('id', requestId)
      .single()

    if (request?.final_amount && request.unit_id) {
      const { data: unit } = await admin
        .from('units')
        .select('property_id')
        .eq('id', request.unit_id)
        .single()

      if (unit?.property_id) {
        // upsert on maintenance_request_id — double-tap safe
        await admin.from('expenses').upsert({
          organization_id:        request.organization_id,
          property_id:            unit.property_id,
          maintenance_request_id: requestId,
          date:                   new Date().toISOString().split('T')[0],
          category:               'Maintenance',
          description:            request.title,
          amount:                 request.final_amount,
          currency:               'OMR',
          notes:                  request.charge_notes ?? null,
        }, { onConflict: 'maintenance_request_id', ignoreDuplicates: true })
      }
    }
  } catch (expenseErr) {
    // Expense creation failure doesn't fail the payment — log only
    console.error('markpaid: expense insert failed', expenseErr)
  }

  return NextResponse.json({ ok: true })
}
