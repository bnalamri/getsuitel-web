-- ============================================================
-- GetSuitel — Real fix for profiles RLS recursion (login outage)
-- Migration: 20260915i_fix_recursion_via_plpgsql.sql
--
-- 20260915g/h added `SET row_security = off` to is_superadmin(),
-- is_hq_admin(), and get_my_organization_id() -- confirmed present
-- in pg_proc.proconfig -- yet the recursion (42P17) persisted.
--
-- Reason: all three were single-statement `LANGUAGE sql` functions.
-- Postgres's planner inlines simple SQL-language functions directly
-- into the calling query when it can. Inlining discards the
-- function-call wrapper entirely, so proconfig settings like
-- `SET row_security = off` never actually get pushed at runtime --
-- the setting was real but silently ineffective.
--
-- Fix: rewrite all three as `LANGUAGE plpgsql`. PL/pgSQL functions
-- are opaque to the planner and are never inlined, so SECURITY
-- DEFINER + SET row_security = off genuinely takes effect.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET row_security = off AS $$
BEGIN
  RETURN (SELECT role = 'superadmin' FROM public.profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.is_hq_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET row_security = off AS $$
BEGIN
  RETURN (SELECT role = 'hq_admin' FROM public.profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security = off AS $$
BEGIN
  RETURN (SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1);
END;
$$;

NOTIFY pgrst, 'reload schema';

-- Verification, same simulated-login technique as before:
begin;
select set_config('request.jwt.claims', json_build_object('sub', 'be4a9870-38c6-4e0a-a62d-9f63429057b1', 'role', 'authenticated')::text, true);
set local role authenticated;
select id, role from public.profiles where id = 'be4a9870-38c6-4e0a-a62d-9f63429057b1';
rollback;
