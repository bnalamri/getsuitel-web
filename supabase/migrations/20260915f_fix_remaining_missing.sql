-- ============================================================
-- 1. properties.address_line2 (trivial, cosmetic)
-- ============================================================
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS address_line2 text;

-- ============================================================
-- 2. platform_settings.superadmin_id (from earlier fix — rerun in
--    case it was skipped; safe either way)
-- ============================================================
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS superadmin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.platform_settings
  DROP CONSTRAINT IF EXISTS platform_settings_key_key;

ALTER TABLE public.platform_settings
  DROP CONSTRAINT IF EXISTS platform_settings_key_superadmin_key;

ALTER TABLE public.platform_settings
  ADD CONSTRAINT platform_settings_key_superadmin_key
  UNIQUE NULLS NOT DISTINCT (key, superadmin_id);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings: own" ON public.platform_settings;
DROP POLICY IF EXISTS "settings: superadmin all" ON public.platform_settings;
DROP POLICY IF EXISTS "Superadmins can read platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Superadmins can write platform settings" ON public.platform_settings;

CREATE POLICY "settings: own"
  ON public.platform_settings FOR ALL
  USING (superadmin_id = auth.uid())
  WITH CHECK (superadmin_id = auth.uid());

-- ============================================================
-- 3. properties.branch_id + the full branch-scoped RLS pass this
--    column belongs to (20260831_branch_rls.sql) — this is the
--    important one: it's what limits each superadmin to their own
--    branch's tenants/contracts/invoices/maintenance/documents/profiles.
-- ============================================================
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_branch ON public.properties(branch_id);

-- Backfill: propagate branch_id from org → property (only where missing)
UPDATE public.properties p
SET    branch_id = o.branch_id
FROM   public.organizations o
WHERE  p.organization_id = o.id
  AND  o.branch_id IS NOT NULL
  AND  p.branch_id IS NULL;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role = 'superadmin' FROM public.profiles WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS "orgs: superadmin all" ON public.organizations;
CREATE POLICY "orgs: superadmin branch"
  ON public.organizations FOR ALL
  USING (public.is_superadmin() AND branch_id = public.get_my_branch_id())
  WITH CHECK (public.is_superadmin() AND branch_id = public.get_my_branch_id());

DROP POLICY IF EXISTS "properties: superadmin all" ON public.properties;
CREATE POLICY "properties: superadmin branch"
  ON public.properties FOR ALL
  USING (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()))
  WITH CHECK (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()));

DROP POLICY IF EXISTS "units: superadmin all" ON public.units;
CREATE POLICY "units: superadmin branch"
  ON public.units FOR ALL
  USING (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()))
  WITH CHECK (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()));

DROP POLICY IF EXISTS "tenants: superadmin all" ON public.tenants;
CREATE POLICY "tenants: superadmin branch"
  ON public.tenants FOR ALL
  USING (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()))
  WITH CHECK (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()));

DROP POLICY IF EXISTS "contracts: superadmin all" ON public.contracts;
CREATE POLICY "contracts: superadmin branch"
  ON public.contracts FOR ALL
  USING (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()))
  WITH CHECK (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()));

DROP POLICY IF EXISTS "invoices: superadmin all" ON public.invoices;
CREATE POLICY "invoices: superadmin branch"
  ON public.invoices FOR ALL
  USING (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()))
  WITH CHECK (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()));

DROP POLICY IF EXISTS "maint: superadmin all" ON public.maintenance_requests;
CREATE POLICY "maint: superadmin branch"
  ON public.maintenance_requests FOR ALL
  USING (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()))
  WITH CHECK (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()));

DROP POLICY IF EXISTS "docs: superadmin all" ON public.documents;
CREATE POLICY "docs: superadmin branch"
  ON public.documents FOR ALL
  USING (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()))
  WITH CHECK (public.is_superadmin() AND organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id()));

DROP POLICY IF EXISTS "profiles: superadmin read" ON public.profiles;
CREATE POLICY "profiles: superadmin branch read"
  ON public.profiles FOR SELECT
  USING (
    public.is_superadmin()
    AND (
      id = auth.uid()
      OR organization_id IN (SELECT id FROM public.organizations WHERE branch_id = public.get_my_branch_id())
    )
  );

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 4. Verify everything landed
-- ============================================================
SELECT 'column' AS kind, table_name, column_name, 'ok' AS status
FROM information_schema.columns
WHERE table_schema='public'
  AND (table_name, column_name) IN (
    ('properties','address_line2'), ('properties','branch_id'), ('platform_settings','superadmin_id')
  )
UNION ALL
SELECT 'policy', tablename, policyname, 'ok'
FROM pg_policies
WHERE schemaname='public'
  AND policyname IN (
    'orgs: superadmin branch','properties: superadmin branch','units: superadmin branch',
    'tenants: superadmin branch','contracts: superadmin branch','invoices: superadmin branch',
    'maint: superadmin branch','docs: superadmin branch','profiles: superadmin branch read',
    'settings: own'
  )
ORDER BY kind, table_name;
