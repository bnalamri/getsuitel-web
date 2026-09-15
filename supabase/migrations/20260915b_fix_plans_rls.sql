-- 1) DIAGNOSTIC — see what's actually on subscription_plans right now
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'subscription_plans';

-- 2) FIX — idempotent, safe to run regardless of what #1 showed.
-- Removes any old/duplicate policy names and (re)creates the one HQ needs.
DROP POLICY IF EXISTS "superadmin read all plans"        ON public.subscription_plans;
DROP POLICY IF EXISTS "superadmin manage plans"           ON public.subscription_plans;
DROP POLICY IF EXISTS "hq admin manage default plans"     ON public.subscription_plans;

CREATE POLICY "hq admin manage default plans"
  ON public.subscription_plans FOR ALL
  USING (public.is_hq_admin())
  WITH CHECK (public.is_hq_admin());

-- 3) Re-run the diagnostic to confirm it's there
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'subscription_plans';
