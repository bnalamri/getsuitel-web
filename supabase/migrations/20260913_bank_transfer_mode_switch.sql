-- ============================================================
-- GetSuitel — Manual/Automatic Bank Transfer Mode Switch
-- Migration: 20260913_bank_transfer_mode_switch.sql
--
-- Bank transfer today is always "manual": payer transfers outside the
-- app, uploads a receipt, the recipient reviews and confirms by hand.
-- This adds an on/off switch at each of the three payment-collecting
-- levels (Owner, Branch, HQ) so that once a real bank/PSP API is wired
-- in later, each level can independently flip to "automatic"
-- (webhook-confirmed) without a further migration. Defaults to
-- 'manual' everywhere — turning the switch on today has no functional
-- effect yet, since no bank API is connected; it exists so the toggle
-- is already in place when one is.
-- ============================================================

-- Owner level
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS bank_transfer_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (bank_transfer_mode IN ('manual', 'automatic'));

-- HQ level
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS hq_bank_transfer_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (hq_bank_transfer_mode IN ('manual', 'automatic'));

-- Branch level uses the existing platform_settings key-value store
-- (scoped per superadmin_id) — no column needed, just a new key:
-- 'payment_bank_transfer_mode' = 'manual' | 'automatic'. Nothing to
-- migrate; the UI/API simply start reading/writing that key.
