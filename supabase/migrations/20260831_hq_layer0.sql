-- ============================================================
-- GetSuitel — HQ Layer 0 (Branch Franchise Model)
-- Migration: 20260831_hq_layer0.sql
-- Run in Supabase SQL editor
-- ============================================================

-- ─── 1. hq_admin ROLE NOTE ───────────────────────────────────
-- user_role enum was dropped in a previous migration.
-- Roles are stored as TEXT in profiles.role — no enum change needed.
-- 'hq_admin' is a valid text value and is enforced via RLS helper functions below.


-- ─── 2. BRANCHES TABLE ──────────────────────────────────────
-- Each row = one licensed branch operator (e.g. "GetSuitel — Riyadh Branch")
CREATE TABLE IF NOT EXISTS public.branches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,                          -- e.g. "Riyadh"
  display_name        TEXT GENERATED ALWAYS AS ('GetSuitel — ' || name || ' Branch') STORED,
  region              TEXT,                                   -- e.g. "Central Arabia"
  city                TEXT,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'archived')),
  license_fee_omr     NUMERIC(10,3) NOT NULL DEFAULT 0,
  revenue_share_pct   NUMERIC(5,2)  NOT NULL DEFAULT 0
                        CHECK (revenue_share_pct >= 0 AND revenue_share_pct <= 100),
  superadmin_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  logo_url            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_branch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_branch_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_branches_status       ON public.branches(status);
CREATE INDEX IF NOT EXISTS idx_branches_superadmin   ON public.branches(superadmin_id);


-- ─── 3. LINK ORGANIZATIONS → BRANCHES ───────────────────────
-- Each org (owned by a branch superadmin) gets a branch_id.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orgs_branch ON public.organizations(branch_id);


-- ─── 4. BRANCH BILLING TABLE ────────────────────────────────
-- One row per branch per calendar month — HQ revenue tracking.
CREATE TABLE IF NOT EXISTS public.branch_billing (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id           UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  month               DATE NOT NULL,   -- always 1st of the month, e.g. 2026-08-01
  total_revenue_omr   NUMERIC(12,3) NOT NULL DEFAULT 0,
  share_amount_omr    NUMERIC(12,3) NOT NULL DEFAULT 0,  -- total_revenue × revenue_share_pct / 100
  license_fee_omr     NUMERIC(10,3) NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid')),
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (branch_id, month)
);

CREATE INDEX IF NOT EXISTS idx_branch_billing_branch ON public.branch_billing(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_billing_month  ON public.branch_billing(month);


-- ─── 5. HELPER FUNCTIONS ────────────────────────────────────

-- Returns TRUE when the calling user is hq_admin
CREATE OR REPLACE FUNCTION public.is_hq_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role = 'hq_admin' FROM public.profiles WHERE id = auth.uid();
$$;

-- Returns the branch_id for the calling superadmin
CREATE OR REPLACE FUNCTION public.get_my_branch_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT b.id
  FROM   public.branches b
  WHERE  b.superadmin_id = auth.uid()
  LIMIT  1;
$$;


-- ─── 6. RLS ON BRANCHES ─────────────────────────────────────
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- HQ can do everything
CREATE POLICY "branches: hq all"
  ON public.branches FOR ALL
  USING (public.is_hq_admin());

-- Superadmin can read their own branch
CREATE POLICY "branches: superadmin read own"
  ON public.branches FOR SELECT
  USING (superadmin_id = auth.uid());


-- ─── 7. RLS ON BRANCH_BILLING ───────────────────────────────
ALTER TABLE public.branch_billing ENABLE ROW LEVEL SECURITY;

-- HQ only
CREATE POLICY "branch_billing: hq all"
  ON public.branch_billing FOR ALL
  USING (public.is_hq_admin());


-- ─── 8. EXTEND EXISTING RLS FOR hq_admin ────────────────────
-- HQ admin must be able to read all tables that superadmin can.
-- We ADD new policies rather than modifying existing ones.

-- profiles: hq reads all
CREATE POLICY "profiles: hq read"
  ON public.profiles FOR SELECT
  USING (public.is_hq_admin());

-- organizations: hq reads/manages all
CREATE POLICY "orgs: hq all"
  ON public.organizations FOR ALL
  USING (public.is_hq_admin());

-- properties: hq reads all
CREATE POLICY "properties: hq all"
  ON public.properties FOR ALL
  USING (public.is_hq_admin());

-- units: hq reads all
CREATE POLICY "units: hq all"
  ON public.units FOR ALL
  USING (public.is_hq_admin());

-- tenants: hq reads all
CREATE POLICY "tenants: hq all"
  ON public.tenants FOR ALL
  USING (public.is_hq_admin());

-- contracts: hq reads all
CREATE POLICY "contracts: hq all"
  ON public.contracts FOR ALL
  USING (public.is_hq_admin());

-- invoices: hq reads all
CREATE POLICY "invoices: hq all"
  ON public.invoices FOR ALL
  USING (public.is_hq_admin());

-- maintenance_requests: hq reads all
CREATE POLICY "maintenance: hq all"
  ON public.maintenance_requests FOR ALL
  USING (public.is_hq_admin());


-- ─── 9. BACKFILL: LINK EXISTING SUPERADMIN → BRANCH ────────
-- If you already have superadmin accounts, run this AFTER creating
-- their branch rows manually in the branches table.
-- Example (replace UUIDs with real values):
--
--   INSERT INTO public.branches (name, city, superadmin_id, license_fee_omr, revenue_share_pct)
--   VALUES ('Muscat', 'Muscat', '<superadmin-user-id>', 50.000, 15.00)
--   RETURNING id;
--
--   UPDATE public.organizations
--   SET branch_id = '<branch-uuid-from-above>'
--   WHERE owner_id IN (
--     SELECT id FROM public.profiles
--     WHERE organization_id IN (
--       SELECT id FROM public.organizations WHERE owner_id = '<superadmin-user-id>'
--     )
--   );
--
-- Also sync branch_name from existing profiles.branch_name:
--   INSERT INTO public.branches (name, city, superadmin_id, logo_url)
--   SELECT branch_name, NULL, id, branch_logo_url
--   FROM   public.profiles
--   WHERE  role = 'superadmin' AND branch_name IS NOT NULL
--   ON CONFLICT DO NOTHING;
