import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { syncChequeOnInvoicePaid } from '@/lib/cheque-invoice-sync'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'manager', 'financial_manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { invoiceId, paid_via, notes, payment_slip_url } = await req.json()
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

  const admin = createAdminClient()
  const update: Record<string, unknown> = {
    status:    'paid',
    paid_date: new Date().toISOString().split('T')[0],
  }
  if (paid_via)         update.paid_via         = paid_via
  if (notes)            update.notes            = notes
  if (payment_slip_url) update.payment_slip_url = payment_slip_url

  const { error } = await admin
    .from('invoices')
    .update(update)
    .eq('id', invoiceId)
    .eq('organization_id', profile.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Keep the Cheque Tracker in sync — see matching comment in
  // /api/invoices/[id]/route.ts. Marking an invoice paid here (Mark Paid
  // button/modal) should also clear its linked cheque, if one exists —
  // and fall back to a cheque_number/unit+month match when it isn't
  // directly linked yet. See lib/cheque-invoice-sync.ts for the full
  // rationale (bug fixed 2026-09-16).
  await syncChequeOnInvoicePaid(admin, invoiceId, update.paid_date as string)

  return NextResponse.json({ ok: true })
}
