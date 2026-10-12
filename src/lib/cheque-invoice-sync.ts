import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Reverse half of the cheque↔invoice sync (invoice marked paid → clear its cheque).
 * Mirrors the matching order used on the forward side (cheque cleared → mark
 * invoice paid, see /api/payments/cheques/[id]/route.ts and
 * lib/screens/owner/owner_cheque_tracker.dart on mobile):
 *
 *   1. invoice_id — a cheque directly linked to this invoice.
 *   2. cheque_number — an exact match on the invoice's own cheque_number
 *      stamp (set by the rent cron when it auto-links a pending cheque to
 *      the invoice it generates — see 20260916b_invoices_cheque_number.sql).
 *   3. unit + due-month window — last-resort fallback for older cheques
 *      registered before this linking existed, that have neither invoice_id
 *      nor a cheque_number stamp to go on.
 *
 * Bug fixed 2026-09-16: previously this only tried step 1, so marking an
 * invoice paid directly (Mark Paid button, or editing the invoice) silently
 * left its cheque showing its old status (e.g. still "deposited") whenever
 * the cheque wasn't already directly linked — true for most cheques
 * registered before today, since cheques are normally registered as
 * post-dated batches before the matching invoice even exists.
 *
 * Call this only once, right after the invoice's own row has already been
 * updated to status='paid' — not on unrelated edits.
 */
export async function syncChequeOnInvoicePaid(
  admin: SupabaseClient,
  invoiceId: string,
  paidDate: string,
) {
  const chequeUpdate = { status: 'cleared', cleared_date: paidDate }
  const notTerminal = '("cleared","bounced","cancelled","replaced")'

  // 1. Direct link
  const { data: direct, error: directErr } = await admin
    .from('cheques')
    .update(chequeUpdate)
    .eq('invoice_id', invoiceId)
    .not('status', 'in', notTerminal)
    .select('id')

  if (directErr) {
    console.error('Invoice paid → cheque sync (direct link) failed:', directErr, { invoiceId })
  }
  if (direct && direct.length > 0) return

  // Need the invoice's own fields for the fallback matches below.
  const { data: inv, error: invErr } = await admin
    .from('invoices')
    .select('unit_id, due_date, cheque_number, organization_id')
    .eq('id', invoiceId)
    .single()

  if (invErr || !inv?.unit_id) return

  // 2. Exact cheque_number match — also backfill the link both ways so
  // future syncs (either direction) take the fast direct path.
  if (inv.cheque_number) {
    const { data: exact, error: exactErr } = await admin
      .from('cheques')
      .update({ ...chequeUpdate, invoice_id: invoiceId })
      .eq('organization_id', inv.organization_id)
      .eq('unit_id', inv.unit_id)
      .eq('cheque_number', inv.cheque_number)
      .not('status', 'in', notTerminal)
      .select('id')

    if (exactErr) {
      console.error('Invoice paid → cheque sync (cheque_number match) failed:', exactErr, { invoiceId })
    }
    if (exact && exact.length > 0) return
  }

  // 3. Unit + due-month window fallback (only cheques not already linked to
  // some other invoice).
  if (!inv.due_date) return
  const [y, m] = inv.due_date.slice(0, 7).split('-').map(Number)
  const monthStart     = `${y}-${String(m).padStart(2, '0')}-01`
  const nextMonthStart = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10)

  const { error: windowErr } = await admin
    .from('cheques')
    .update({ ...chequeUpdate, invoice_id: invoiceId })
    .eq('organization_id', inv.organization_id)
    .eq('unit_id', inv.unit_id)
    .is('invoice_id', null)
    .gte('due_date', monthStart)
    .lt('due_date', nextMonthStart)
    .not('status', 'in', notTerminal)

  if (windowErr) {
    console.error('Invoice paid → cheque sync (month-window match) failed:', windowErr, { invoiceId })
  }
}
