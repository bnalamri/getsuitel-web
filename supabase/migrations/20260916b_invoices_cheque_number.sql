-- ============================================================
-- GetSuitel — Stamp invoices with the cheque expected to pay them
-- Migration: 20260916b_invoices_cheque_number.sql
--
-- Context: cheques are usually registered as a batch of post-dated
-- cheques up front (one per month of the lease), before the matching
-- monthly rent invoice exists — so cheques.invoice_id is normally NULL
-- at registration time. When a cheque later clears, both web
-- (src/app/api/payments/cheques/[id]/route.ts) and mobile
-- (lib/screens/owner/owner_cheque_tracker.dart) need a reliable way to
-- find "the invoice this cheque was for" without invoice_id.
--
-- Mobile's old fallback picked the tenant's oldest unpaid invoice of
-- ANY type — wrong whenever a tenant has more than one unpaid invoice
-- at once (e.g. last month's overdue rent + this month's utility bill).
-- Web's fallback matched by unit_id + the cheque's due-date month, which
-- is safer but still a guess.
--
-- Fix (this migration + the cron change that uses it): when the rent
-- cron auto-generates a unit's monthly invoice, it now looks for a
-- still-unlinked pending cheque for that unit due in the same month and
-- links them both ways — sets cheques.invoice_id on the cheque AND
-- stamps invoices.cheque_number here for a fast, exact match. Going
-- forward, both web and mobile check invoice_id first, then this
-- cheque_number stamp, and only fall back to the month-window guess for
-- older/unlinked records.
-- ============================================================

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cheque_number text;

COMMENT ON COLUMN public.invoices.cheque_number IS
  'Cheque number expected to pay this invoice. Stamped automatically by the rent cron when it links a pending post-dated cheque (cheques.invoice_id) to the invoice it generates for the same unit/month. NULL if paid by another method, or not yet linked to a cheque.';

NOTIFY pgrst, 'reload schema';
