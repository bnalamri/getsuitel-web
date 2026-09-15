-- ============================================================
-- GetSuitel — Fix infinite recursion on profiles RLS (login outage)
-- Migration: 20260915g_fix_profiles_rls_recursion.sql
--
-- Root cause (2026-09-15 login outage):
--   is_superadmin() and is_hq_admin() are SECURITY DEFINER helper
--   functions that read public.profiles internally. is_superadmin()
--   is used inside "profiles: superadmin branch read", a policy
--   defined ON public.profiles itself. Every read of profiles
--   evaluates that policy -> calls is_superadmin() -> reads
--   profiles again -> re-evaluates the same policy -> Postgres
--   detects the loop and raises:
--     {"code":"42P17","message":"infinite recursion detected in
--      policy for relation \"profiles\""}
--   This affected EVERY role, including plain owners, because the
--   recursive policy is evaluated for every row read on profiles
--   regardless of whether a separate self-read policy would also
--   grant access. SECURITY DEFINER alone does not skip RLS for the
--   function's own internal queries -- it must explicitly say so.
--
-- Fix: add `SET row_security = off` to both helper functions, so
-- their internal profiles lookups bypass RLS entirely and can never
-- re-trigger the policy that called them.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET row_security = off AS $$
  SELECT role = 'superadmin' FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_hq_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET row_security = off AS $$
  SELECT role = 'hq_admin' FROM public.profiles WHERE id = auth.uid();
$$;

NOTIFY pgrst, 'reload schema';

-- Verification: this must return without error and without hanging.
-- If the recursion is truly fixed, this succeeds instantly.
SELECT id, role FROM public.profiles LIMIT 1;
