import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { syncChequeOnInvoicePaid } from '@/lib/cheque-invoice-sync'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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

  const body = await req.json()
  const { tenant_id, unit_id, type, amount, currency, due_date, status, notes, payment_slip_url } = body

  const admin = createAdminClient()

  // Read the invoice's prior status so we know whether this edit is what's
  // actually marking it paid (vs. an unrelated field edit on an already-paid
  // invoice) — only a fresh transition should cascade to the cheque below.
  const { data: before } = await admin
    .from('invoices')
    .select('status')
    .eq('id', params.id)
    .single()

  const { error } = await admin
    .from('invoices')
    .update({
      tenant_id,
      unit_id,
      type,
      amount: Number(amount),
      currency,
      due_date,
      status,
      notes: notes ?? null,
      // Clear paid_date when status is not paid
      paid_date: status === 'paid' ? undefined : null,
      ...(payment_slip_url !== undefined ? { payment_slip_url } : {}),
    })
    .eq('id', params.id)
    .eq('organization_id', profile.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Keep the Cheque Tracker in sync: if this edit just marked the invoice
  // paid, flip its cheque to "cleared" too — falling back to a
  // cheque_number/unit+month match when it isn't directly linked yet (most
  // cheques registered before today were never linked). Without this,
  // marking an invoice paid directly from the Invoices page (instead of via
  // the Cheque Tracker's own "Update" action) silently leaves the cheque
  // row showing its old status (e.g. still "deposited"). See
  // lib/cheque-invoice-sync.ts for the full matching order.
  if (status === 'paid' && before?.status !== 'paid') {
    await syncChequeOnInvoicePaid(admin, params.id, new Date().toISOString().split('T')[0])
  }

  return NextResponse.json({ ok: true })
}
