-- ============================================================
-- GetSuitel — Fix remaining profiles-reading helper functions (login outage)
-- Migration: 20260915k_fix_remaining_profile_reading_functions.sql
--
-- The superadmin-role simulated-login test (unlike the tenant one)
-- still hit 42P17, because superadmin fully evaluates
-- "profiles: superadmin branch read" (is_superadmin() is true, so
-- the OR branch touching organizations gets evaluated too). That
-- reads organizations, which -- even after 20260915j -- still had
-- three more helper functions with the exact same bug: LANGUAGE sql
-- SECURITY DEFINER reading public.profiles, with no
-- `SET row_security = off`, used by policies "orgs: member read"
-- (get_my_org()), "branches: hq finance update"
-- (is_hq_finance_or_admin()), and "branches: hq team read"
-- (is_hq_team()).
--
-- Fix: same plpgsql + row_security=off pattern as 20260915i.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_org()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET row_security = off AS $$
BEGIN
  RETURN (SELECT organization_id FROM public.profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.is_hq_finance_or_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET row_security = off AS $$
BEGIN
  RETURN (SELECT role IN ('hq_admin', 'hq_finance') FROM public.profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.is_hq_team()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET row_security = off AS $$
BEGIN
  RETURN (SELECT role IN ('hq_admin', 'hq_staff', 'hq_finance') FROM public.profiles WHERE id = auth.uid());
END;
$$;

NOTIFY pgrst, 'reload schema';

-- Verification using the superadmin account that exposed this
-- (the one the tenant-account test didn't catch, since is_superadmin()
-- being false short-circuits before ever reaching organizations):
begin;
select set_config('request.jwt.claims', json_build_object('sub', '1994d3af-06dd-4ed0-9546-9f424533bd60', 'role', 'authenticated')::text, true);
set local role authenticated;
select id, role, organization_id from public.profiles where id = '1994d3af-06dd-4ed0-9546-9f424533bd60';
rollback;
