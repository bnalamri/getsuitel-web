-- ============================================================
-- GetSuitel — Fix second RLS recursion on profiles (login outage cont'd)
-- Migration: 20260915h_fix_get_my_organization_id_recursion.sql
--
-- pg_policy dump on public.profiles revealed a THIRD helper function
-- with the same bug as is_superadmin()/is_hq_admin() (fixed in
-- 20260915g): get_my_organization_id() is SECURITY DEFINER but reads
-- public.profiles internally WITHOUT `SET row_security = off`, and
-- it is used by policy "mobile_owner_profiles_select" defined ON
-- public.profiles itself -> same infinite recursion (42P17).
-- This function was never tracked in a migration file (created
-- directly via the SQL editor at some point) -- pulled its live
-- definition via pg_get_functiondef() to confirm before fixing.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

NOTIFY pgrst, 'reload schema';

-- Verification, simulating an actual authenticated (non-superadmin,
-- non-hq_admin) request end to end, same technique as before:
begin;
select set_config('request.jwt.claims', json_build_object('sub', 'be4a9870-38c6-4e0a-a62d-9f63429057b1', 'role', 'authenticated')::text, true);
set local role authenticated;
select id, role from public.profiles where id = 'be4a9870-38c6-4e0a-a62d-9f63429057b1';
rollback;
