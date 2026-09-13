-- ============================================================
-- GetSuitel — Rename "Mobile Wallet" display label to "Mobile Transfer"
-- Migration: 20260913_rename_mobile_wallet_label.sql
--
-- Cosmetic only: no column, key, or feature_key is renamed.
-- `mobile_wallet` stays the internal feature key / column-name
-- prefix everywhere (organizations.mobile_wallet_*, platform_settings
-- key 'payment_mobile_wallet', platform_feature_flags.feature_key).
-- Only the human-facing label/default text changes.
-- ============================================================

-- 1. HQ feature-flag catalogue label (shown on Super Admin / Owner
--    feature-flag toggle cards)
UPDATE public.platform_feature_flags
SET label = 'Mobile Transfer'
WHERE feature_key = 'mobile_wallet' AND label = 'Mobile Wallet';

-- 2. Existing orgs that never customized their label (still holding
--    the old default) — update so tenants stop seeing "Mobile Wallet"
UPDATE public.organizations
SET mobile_wallet_label = 'Mobile Transfer'
WHERE mobile_wallet_label = 'Mobile Wallet' OR mobile_wallet_label IS NULL;

-- 3. New-row default going forward
ALTER TABLE public.organizations
  ALTER COLUMN mobile_wallet_label SET DEFAULT 'Mobile Transfer';

-- 4. Branch-level platform_settings default label, if any branch saved
--    the old default without customizing it
UPDATE public.platform_settings
SET value = 'Mobile Transfer'
WHERE key = 'payment_mobile_label' AND value = 'Mobile Wallet';
