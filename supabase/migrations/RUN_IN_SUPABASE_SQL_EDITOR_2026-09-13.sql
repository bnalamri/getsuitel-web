-- ============================================================
-- GetSuitel — Combined migration for the 2026-09-13 HQ Payments work
-- Run this ONCE in the Supabase Dashboard SQL Editor (Project ->
-- SQL Editor -> New query -> paste all of this -> Run).
--
-- All four source files are concatenated below in a safe order.
-- Every statement uses IF NOT EXISTS / IF EXISTS guards, so this is
-- safe to run even if some part was already applied — nothing will
-- error out or duplicate data.
--
-- NOTE: this file is a convenience copy for pasting into the Supabase
-- Dashboard. It is intentionally kept OUTSIDE supabase/migrations/ so
-- the Supabase CLI never treats it as a tracked migration on its own —
-- the four real, timestamped migration files it merges already live
-- in supabase/migrations/ as the source of truth.
-- ============================================================


-- ============================================================
-- 1) 20260913_hq_payment_details.sql
-- Adds HQ's own bank / mobile-transfer details to platform_config
-- ============================================================
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS hq_bank_name             TEXT,
  ADD COLUMN IF NOT EXISTS hq_bank_account_name      TEXT,
  ADD COLUMN IF NOT EXISTS hq_bank_iban              TEXT,
  ADD COLUMN IF NOT EXISTS hq_mobile_transfer_number TEXT,
  ADD COLUMN IF NOT EXISTS hq_mobile_transfer_label  TEXT DEFAULT 'Mobile Transfer';


-- ============================================================
-- 2) 20260913_branch_billing_receipts.sql
-- Adds submit -> confirm/reject receipt columns to branch_billing
-- ============================================================
ALTER TABLE public.branch_billing
  ADD COLUMN IF NOT EXISTS receipt_url       TEXT,
  ADD COLUMN IF NOT EXISTS payment_method    TEXT
    CHECK (payment_method IN ('bank_transfer', 'mobile_transfer', 'cash')),
  ADD COLUMN IF NOT EXISTS submitted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason  TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'branch_billing' AND constraint_name = 'branch_billing_status_check'
  ) THEN
    ALTER TABLE public.branch_billing DROP CONSTRAINT branch_billing_status_check;
  END IF;
END $$;

ALTER TABLE public.branch_billing
  ADD CONSTRAINT branch_billing_status_check
  CHECK (status IN ('pending', 'submitted', 'paid', 'rejected'));


-- ============================================================
-- 3) 20260913_bank_transfer_mode_switch.sql
-- Manual/automatic bank-transfer-mode switch at Owner + HQ levels
-- (Branch level reuses platform_settings key 'payment_bank_transfer_mode',
-- no schema change needed for that one)
-- ============================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS bank_transfer_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (bank_transfer_mode IN ('manual', 'automatic'));

ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS hq_bank_transfer_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (hq_bank_transfer_mode IN ('manual', 'automatic'));


-- ============================================================
-- 4) 20260913_rename_mobile_wallet_label.sql
-- Cosmetic label cleanup: "Mobile Wallet" -> "Mobile Transfer"
-- (column/key names are unchanged, only display text)
-- ============================================================
UPDATE public.platform_feature_flags
SET label = 'Mobile Transfer'
WHERE feature_key = 'mobile_wallet' AND label = 'Mobile Wallet';

UPDATE public.organizations
SET mobile_wallet_label = 'Mobile Transfer'
WHERE mobile_wallet_label = 'Mobile Wallet' OR mobile_wallet_label IS NULL;

ALTER TABLE public.organizations
  ALTER COLUMN mobile_wallet_label SET DEFAULT 'Mobile Transfer';

UPDATE public.platform_settings
SET value = 'Mobile Transfer'
WHERE key = 'payment_mobile_label' AND value = 'Mobile Wallet';
