-- ============================================================
-- GetSuitel — HQ Payment Details
-- Migration: 20260913_hq_payment_details.sql
--
-- Adds HQ's own bank / mobile-transfer details to platform_config
-- (singleton row, id=1) so branches can see where to send their
-- monthly license fee + revenue share, instead of that being
-- arranged entirely outside the app.
-- ============================================================

ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS hq_bank_name             TEXT,
  ADD COLUMN IF NOT EXISTS hq_bank_account_name      TEXT,
  ADD COLUMN IF NOT EXISTS hq_bank_iban              TEXT,
  ADD COLUMN IF NOT EXISTS hq_mobile_transfer_number TEXT,
  ADD COLUMN IF NOT EXISTS hq_mobile_transfer_label  TEXT DEFAULT 'Mobile Transfer';
