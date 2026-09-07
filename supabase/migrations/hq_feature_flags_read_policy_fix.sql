-- ═══════════════════════════════════════════════════════════════════════════
-- Fix: Super Admin / Owner Feature Flags cards show empty / don't appear
-- Run in Supabase SQL Editor (Project → SQL Editor → New query)
--
-- Root cause: platform_feature_flags (Batch G migration) has exactly one
-- RLS policy, "HQ admin full access to platform_feature_flags", which
-- restricts BOTH read and write to is_hq_admin(). That's correct for
-- writes, but the new Super Admin and Owner feature-flag tiers
-- (hq_feature_flags_cascade.sql) both need to READ this table to compute
-- their live ceiling — HQ's enabled_globally / branch_overrides is the top
-- of the cascade. With no read policy, Postgrest silently returns zero
-- rows to a superadmin or owner (not an error — RLS just filters every
-- row out), so /api/superadmin/flags and /api/owner/flags both come back
-- with an empty flags array: the Super Admin card shows "No feature flags
-- found" and the Owner card, which hides itself when there's nothing to
-- show, doesn't render at all.
--
-- This adds read-only SELECT policies for superadmin and owner roles.
-- Writes remain HQ-only, exactly as before.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "platform_feature_flags: superadmin read" ON public.platform_feature_flags;
CREATE POLICY "platform_feature_flags: superadmin read"
  ON public.platform_feature_flags FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

DROP POLICY IF EXISTS "platform_feature_flags: owner read" ON public.platform_feature_flags;
CREATE POLICY "platform_feature_flags: owner read"
  ON public.platform_feature_flags FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );
