-- ============================================================
-- GetSuitel — Fix RLS recursion via organizations/branches policies
-- Migration: 20260915j_fix_org_branch_policies_recursion.sql
--
-- pg_policy dump on organizations/branches revealed the true source
-- of the persistent 42P17 recursion: three policies with a RAW
-- inline subquery against public.profiles (not routed through any
-- of the helper functions fixed in 20260915i):
--
--   organizations."hq can read organizations":
--     EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
--             AND profiles.role = ANY (ARRAY['hq_admin','hq_staff']))
--
--   organizations."staff can read their organization":
--     id IN (SELECT profiles.organization_id FROM profiles
--            WHERE profiles.id = auth.uid()
--            AND profiles.role = ANY (ARRAY['property_manager','financial_manager']))
--
--   branches."hq_staff can read branches":
--     EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
--             AND profiles.role = ANY (ARRAY['hq_admin','hq_staff']))
--
-- Chain: reading profiles -> "profiles: superadmin branch read"
-- reads organizations -> one of the above reads profiles again
-- WITHOUT bypassing RLS -> loop. Fixing the profiles-side functions
-- alone (20260915g/h/i) was not enough because the recursion
-- re-enters through these two other tables.
--
-- Fix: same pattern as before -- move the profiles lookup into a
-- SECURITY DEFINER plpgsql function with row_security off, so it
-- can never re-trigger RLS on profiles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_hq_admin_or_staff()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET row_security = off AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY (ARRAY['hq_admin','hq_staff'])
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_staff_organization_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET row_security = off AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM public.profiles
    WHERE id = auth.uid() AND role = ANY (ARRAY['property_manager','financial_manager'])
    LIMIT 1
  );
END;
$$;

DROP POLICY IF EXISTS "hq can read organizations" ON public.organizations;
CREATE POLICY "hq can read organizations"
  ON public.organizations FOR SELECT
  USING (public.is_hq_admin_or_staff());

DROP POLICY IF EXISTS "staff can read their organization" ON public.organizations;
CREATE POLICY "staff can read their organization"
  ON public.organizations FOR SELECT
  USING (id = public.get_my_staff_organization_id());

DROP POLICY IF EXISTS "hq_staff can read branches" ON public.branches;
CREATE POLICY "hq_staff can read branches"
  ON public.branches FOR SELECT
  USING (public.is_hq_admin_or_staff());

NOTIFY pgrst, 'reload schema';

-- Verification, same simulated-login technique as before:
begin;
select set_config('request.jwt.claims', json_build_object('sub', 'be4a9870-38c6-4e0a-a62d-9f63429057b1', 'role', 'authenticated')::text, true);
set local role authenticated;
select id, role from public.profiles where id = 'be4a9870-38c6-4e0a-a62d-9f63429057b1';
rollback;
