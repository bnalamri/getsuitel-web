-- ═══════════════════════════════════════════════════════════════════════════
-- Property Deletion Feature Flag — HQ → Super Admin ceiling
-- Run in Supabase SQL Editor (Project → SQL Editor → New query)
--
-- Adds a 10th flag, "property_deletion", to the existing HQ → Super Admin →
-- Owner feature-flag cascade (see hq_feature_flags_cascade.sql). It follows
-- the same "stops at Super Admin" pattern already used by expense_tracking,
-- utility_bills and staff_invitations: it gates an Owner's own capability
-- (deleting a property they created) with nothing to hand down to a tenant,
-- so it gets a branch_feature_flags row but deliberately NO org_feature_flags
-- row — an Owner never gets a self-toggle for this one. Only HQ and the
-- branch's own Super Admin can turn it on.
--
-- Unlike all 9 existing flags (which default to enabled), this one defaults
-- to DISABLED everywhere — by design: owners can create properties (capped
-- by organizations.max_properties, a separate subscription-plan limit) but
-- may not delete them unless a Super Admin or HQ explicitly grants that
-- permission for the branch/org. That's why platform_feature_flags gets a
-- new default_branch_enabled column instead of reusing the old trigger's
-- hardcoded `true` — this generalizes to any future flag that should also
-- default to off.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Add a per-flag branch-seed default (existing flags keep defaulting to true) ──
ALTER TABLE public.platform_feature_flags
  ADD COLUMN IF NOT EXISTS default_branch_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- ── 2. Register the new flag, disabled globally by default ─────────────────
INSERT INTO public.platform_feature_flags (feature_key, label, description, enabled_globally, default_branch_enabled)
VALUES (
  'property_deletion',
  'Property Deletion',
  'Allow owners to delete a property outright. Off by default — owners can create properties up to their plan limit but cannot remove them without Super Admin/HQ granting this permission.',
  false,
  false
)
ON CONFLICT (feature_key) DO UPDATE SET default_branch_enabled = EXCLUDED.default_branch_enabled;

-- ── 3. Seed a branch_feature_flags row per existing branch, disabled ───────
INSERT INTO public.branch_feature_flags (feature_key, branch_id, enabled_branchwide)
SELECT 'property_deletion', b.id, false
FROM public.branches b
ON CONFLICT (feature_key, branch_id) DO NOTHING;

-- Deliberately NOT inserting into org_feature_flags — Owners get no
-- self-toggle for this flag (matches expense_tracking / utility_bills /
-- staff_invitations).

-- ── 4. Update the branch-seed trigger to respect each flag's own default ───
-- Existing trigger hardcoded `true` for every flag; now every flag (old or
-- new) seeds according to its own default_branch_enabled.
CREATE OR REPLACE FUNCTION public.seed_branch_feature_flags()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.branch_feature_flags (feature_key, branch_id, enabled_branchwide)
  SELECT feature_key, NEW.id, default_branch_enabled FROM public.platform_feature_flags
  ON CONFLICT (feature_key, branch_id) DO NOTHING;
  RETURN NEW;
END;
$$;
-- Trigger itself (trg_seed_branch_feature_flags on public.branches) is
-- unchanged — it already points at this function name.
