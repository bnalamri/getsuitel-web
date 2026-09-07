-- ═══════════════════════════════════════════════════════════════════════════
-- Feature Flags Cascade — HQ → Super Admin → Owner
-- Run in Supabase SQL Editor (Project → SQL Editor → New query)
--
-- Extends the existing HQ-level platform_feature_flags (Batch G migration)
-- with two more tiers, matching the app's existing role hierarchy:
--   HQ (platform)  →  Super Admin (one branch)  →  Owner (one organization)
-- Each tier can only narrow what the tier above it already allows — a
-- ceiling model. That ceiling is enforced in the API route code (not here
-- in SQL), consistent with how the rest of this app keeps business logic
-- in the Next.js API layer rather than DB triggers.
--
-- Only 6 of the 9 flags are tenant-facing and therefore show up at the
-- Owner tier (Owner is the last "admin" screen before the feature actually
-- reaches a tenant). The other 3 — expense_tracking, utility_bills,
-- staff_invitations — gate an owner's own capability with nothing further
-- to hand down to a tenant, so they stop at Super Admin.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. branch_feature_flags (Super Admin tier) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.branch_feature_flags (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key           TEXT NOT NULL REFERENCES public.platform_feature_flags(feature_key) ON DELETE CASCADE,
  branch_id             UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  enabled_branchwide    BOOLEAN NOT NULL DEFAULT TRUE,
  org_overrides         JSONB   NOT NULL DEFAULT '{}'::jsonb,  -- { org_id: true|false }
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE (feature_key, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_feature_flags_branch ON public.branch_feature_flags(branch_id);

ALTER TABLE public.branch_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_feature_flags: hq all" ON public.branch_feature_flags;
CREATE POLICY "branch_feature_flags: hq all"
  ON public.branch_feature_flags FOR ALL
  TO authenticated
  USING (public.is_hq_admin())
  WITH CHECK (public.is_hq_admin());

DROP POLICY IF EXISTS "branch_feature_flags: superadmin own branch" ON public.branch_feature_flags;
CREATE POLICY "branch_feature_flags: superadmin own branch"
  ON public.branch_feature_flags FOR ALL
  TO authenticated
  USING  (branch_id = public.get_my_branch_id())
  WITH CHECK (branch_id = public.get_my_branch_id());

-- Owners need read access to know what's available to them (their org's
-- effective value is capped by this row) — read-only, no write.
DROP POLICY IF EXISTS "branch_feature_flags: owner read own branch" ON public.branch_feature_flags;
CREATE POLICY "branch_feature_flags: owner read own branch"
  ON public.branch_feature_flags FOR SELECT
  TO authenticated
  USING (
    branch_id = (
      SELECT o.branch_id FROM public.organizations o
      JOIN public.profiles p ON p.organization_id = o.id
      WHERE p.id = auth.uid()
      LIMIT 1
    )
  );

-- Seed a branch_feature_flags row per existing branch × all 9 flags
INSERT INTO public.branch_feature_flags (feature_key, branch_id, enabled_branchwide)
SELECT f.feature_key, b.id, true
FROM public.platform_feature_flags f
CROSS JOIN public.branches b
ON CONFLICT (feature_key, branch_id) DO NOTHING;


-- ── 2. org_feature_flags (Owner tier) ────────────────────────────────────────
-- Only the 6 tenant-facing flags get a row here.
CREATE TABLE IF NOT EXISTS public.org_feature_flags (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key           TEXT NOT NULL REFERENCES public.platform_feature_flags(feature_key) ON DELETE CASCADE,
  organization_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE (feature_key, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_feature_flags_org ON public.org_feature_flags(organization_id);

ALTER TABLE public.org_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_feature_flags: hq all" ON public.org_feature_flags;
CREATE POLICY "org_feature_flags: hq all"
  ON public.org_feature_flags FOR ALL
  TO authenticated
  USING (public.is_hq_admin())
  WITH CHECK (public.is_hq_admin());

DROP POLICY IF EXISTS "org_feature_flags: superadmin own branch orgs" ON public.org_feature_flags;
CREATE POLICY "org_feature_flags: superadmin own branch orgs"
  ON public.org_feature_flags FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()
    )
  );

DROP POLICY IF EXISTS "org_feature_flags: owner own org" ON public.org_feature_flags;
CREATE POLICY "org_feature_flags: owner own org"
  ON public.org_feature_flags FOR ALL
  TO authenticated
  USING  (organization_id = public.get_my_org())
  WITH CHECK (organization_id = public.get_my_org());

-- Seed an org_feature_flags row per existing organization × the 6 tenant-facing flags
INSERT INTO public.org_feature_flags (feature_key, organization_id, enabled)
SELECT f.feature_key, o.id, true
FROM public.platform_feature_flags f
CROSS JOIN public.organizations o
WHERE f.feature_key IN ('bank_transfer', 'cheque_payments', 'mobile_wallet', 'maintenance', 'notices_system', 'tenant_portal')
ON CONFLICT (feature_key, organization_id) DO NOTHING;


-- ── 3. Keep new branches/orgs seeded automatically ──────────────────────────
-- New branch → seed all 9 branch_feature_flags rows
CREATE OR REPLACE FUNCTION public.seed_branch_feature_flags()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.branch_feature_flags (feature_key, branch_id, enabled_branchwide)
  SELECT feature_key, NEW.id, true FROM public.platform_feature_flags
  ON CONFLICT (feature_key, branch_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_branch_feature_flags ON public.branches;
CREATE TRIGGER trg_seed_branch_feature_flags
  AFTER INSERT ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.seed_branch_feature_flags();

-- New organization → seed the 6 tenant-facing org_feature_flags rows
CREATE OR REPLACE FUNCTION public.seed_org_feature_flags()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.org_feature_flags (feature_key, organization_id, enabled)
  SELECT feature_key, NEW.id, true FROM public.platform_feature_flags
  WHERE feature_key IN ('bank_transfer', 'cheque_payments', 'mobile_wallet', 'maintenance', 'notices_system', 'tenant_portal')
  ON CONFLICT (feature_key, organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_org_feature_flags ON public.organizations;
CREATE TRIGGER trg_seed_org_feature_flags
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.seed_org_feature_flags();
