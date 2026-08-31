-- ============================================================
-- GetSuitel — Branch-Scoped RLS for Superadmin
-- Migration: 20260831_branch_rls.sql
-- Run AFTER 20260831_hq_layer0.sql
--
-- Items covered:
--   Item 3  — Add branch_id FK to properties
--   Item 5  — Propagate branch scope to tenants, maintenance_requests, invoices
--   Item 7  — RLS: superadmin scoped to their branch only
--
-- PREREQUISITE (production):
--   Before running, ensure each superadmin has a matching row in public.branches
--   with superadmin_id = their auth.uid(), AND their organizations have branch_id set.
--   If you skip this, get_my_branch_id() returns NULL → superadmin sees no data.
--
--   Quick backfill example (run BEFORE this migration):
--     INSERT INTO public.branches (name, city, superadmin_id, license_fee_omr, revenue_share_pct)
--     VALUES ('Muscat', 'Muscat', '<superadmin-uuid>', 50.000, 15.00)
--     RETURNING id;
--
--     UPDATE public.organizations
--     SET branch_id = '<branch-uuid>'
--     WHERE owner_id = '<superadmin-uuid>';
-- ============================================================


-- ─── 1. Add branch_id to properties (item 3) ─────────────────────────────────
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_branch ON public.properties(branch_id);

-- Optional backfill: propagate branch_id from org → property
-- (safe to run; only updates rows where org has a branch_id set)
UPDATE public.properties p
SET    branch_id = o.branch_id
FROM   public.organizations o
WHERE  p.organization_id = o.id
  AND  o.branch_id IS NOT NULL
  AND  p.branch_id IS NULL;


-- ─── 2. is_superadmin() helper ───────────────────────────────────────────────
-- Uses plain text comparison to avoid user_role enum issues.
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role = 'superadmin' FROM public.profiles WHERE id = auth.uid();
$$;


-- ─── 3. Replace superadmin all-branch policies with branch-scoped ones ────────

-- ── ORGANIZATIONS ──────────────────────────────────────────────────────────────
-- Was: access to all orgs regardless of branch
-- Now: only orgs in superadmin's branch
DROP POLICY IF EXISTS "orgs: superadmin all" ON public.organizations;

CREATE POLICY "orgs: superadmin branch"
  ON public.organizations FOR ALL
  USING (
    public.is_superadmin()
    AND branch_id = public.get_my_branch_id()
  )
  WITH CHECK (
    public.is_superadmin()
    AND branch_id = public.get_my_branch_id()
  );


-- ── PROPERTIES ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "properties: superadmin all" ON public.properties;

CREATE POLICY "properties: superadmin branch"
  ON public.properties FOR ALL
  USING (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  );


-- ── UNITS ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "units: superadmin all" ON public.units;

CREATE POLICY "units: superadmin branch"
  ON public.units FOR ALL
  USING (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  );


-- ── TENANTS ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenants: superadmin all" ON public.tenants;

CREATE POLICY "tenants: superadmin branch"
  ON public.tenants FOR ALL
  USING (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  );


-- ── CONTRACTS ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "contracts: superadmin all" ON public.contracts;

CREATE POLICY "contracts: superadmin branch"
  ON public.contracts FOR ALL
  USING (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  );


-- ── INVOICES ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "invoices: superadmin all" ON public.invoices;

CREATE POLICY "invoices: superadmin branch"
  ON public.invoices FOR ALL
  USING (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  );


-- ── MAINTENANCE REQUESTS ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "maint: superadmin all" ON public.maintenance_requests;

CREATE POLICY "maint: superadmin branch"
  ON public.maintenance_requests FOR ALL
  USING (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  );


-- ── DOCUMENTS ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "docs: superadmin all" ON public.documents;

CREATE POLICY "docs: superadmin branch"
  ON public.documents FOR ALL
  USING (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  )
  WITH CHECK (
    public.is_superadmin()
    AND organization_id IN (
      SELECT id FROM public.organizations
      WHERE  branch_id = public.get_my_branch_id()
    )
  );


-- ── PROFILES ──────────────────────────────────────────────────────────────────
-- Superadmin sees their own profile + all profiles belonging to their branch's orgs
DROP POLICY IF EXISTS "profiles: superadmin read" ON public.profiles;

CREATE POLICY "profiles: superadmin branch read"
  ON public.profiles FOR SELECT
  USING (
    public.is_superadmin()
    AND (
      id = auth.uid()                          -- own profile always
      OR organization_id IN (
        SELECT id FROM public.organizations
        WHERE  branch_id = public.get_my_branch_id()
      )
    )
  );
