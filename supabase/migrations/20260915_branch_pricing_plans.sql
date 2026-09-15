-- ─────────────────────────────────────────────────────────────────────────
-- Branch-scoped pricing plans
--
-- Problem being fixed (raised by Badar 2026-09-15):
--  1. subscription_plans was a single global table. Any superadmin, from
--     any branch, could edit it (RLS only checked role = 'superadmin',
--     no branch scoping) — so every branch shared one price list, and
--     whoever last saved it changed prices for the whole platform.
--  2. The public homepage always showed that one global list.
--  3. Currency for that list came from a *different*, already
--     per-superadmin-scoped table (platform_settings, key =
--     'default_currency') queried with no filter — so once more than one
--     branch had ever saved a currency preference, the lookup matched
--     multiple rows, .single() threw, and the route silently fell back
--     to the OMR default. That's the real mechanism behind "not sure
--     where currency comes from, maybe last super-admin edited it."
--
-- Fix: subscription_plans becomes the HQ-owned *default* plan catalogue
-- (only hq_admin may edit it from here on). A new branch_subscription_plans
-- table holds each branch's own overrides, one row per (branch_id, slug),
-- following the exact same cascade shape already used for
-- platform_feature_flags -> branch_feature_flags in
-- hq_feature_flags_cascade.sql. A branch that hasn't customized a slug
-- simply falls back to the HQ default for it — no branch is ever left
-- with "no pricing."
-- ─────────────────────────────────────────────────────────────────────────

-- 1. subscription_plans becomes HQ-only, and gets its own currency per row
--    (a plan's price and its currency travel together).
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'OMR';

DROP POLICY IF EXISTS "superadmin read all plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "superadmin manage plans"   ON public.subscription_plans;

-- Public read of active plans stays as-is (homepage HQ-default section,
-- and the /pricing page's fallback when a branch has no overrides yet).

CREATE POLICY "hq admin manage default plans"
  ON public.subscription_plans FOR ALL
  USING (public.is_hq_admin())
  WITH CHECK (public.is_hq_admin());


-- 2. branch_subscription_plans — one row per branch per plan slug.
--    Only the slugs present here override the HQ default for that branch;
--    everything else falls back to subscription_plans.
CREATE TABLE IF NOT EXISTS public.branch_subscription_plans (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id       UUID        NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  slug            TEXT        NOT NULL,
  name_en         TEXT        NOT NULL DEFAULT '',
  name_ar         TEXT        NOT NULL DEFAULT '',
  desc_en         TEXT        NOT NULL DEFAULT '',
  desc_ar         TEXT        NOT NULL DEFAULT '',
  price_monthly   NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency        TEXT        NOT NULL DEFAULT 'OMR',
  stripe_price_id TEXT        DEFAULT '',
  max_properties  INT         NOT NULL DEFAULT -1,
  max_units       INT         NOT NULL DEFAULT -1,
  max_tenants     INT         NOT NULL DEFAULT -1,
  max_staff       INT         NOT NULL DEFAULT -1,
  trial_days      INT         NOT NULL DEFAULT 30,
  features_en     JSONB       NOT NULL DEFAULT '[]',
  features_ar     JSONB       NOT NULL DEFAULT '[]',
  is_popular      BOOLEAN     NOT NULL DEFAULT false,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  sort_order      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_branch_subscription_plans_branch
  ON public.branch_subscription_plans(branch_id);

ALTER TABLE public.branch_subscription_plans ENABLE ROW LEVEL SECURITY;

-- HQ can see and manage every branch's overrides.
DROP POLICY IF EXISTS "branch_subscription_plans: hq all" ON public.branch_subscription_plans;
CREATE POLICY "branch_subscription_plans: hq all"
  ON public.branch_subscription_plans FOR ALL
  USING (public.is_hq_admin())
  WITH CHECK (public.is_hq_admin());

-- A superadmin can only see/manage their own branch's overrides.
DROP POLICY IF EXISTS "branch_subscription_plans: superadmin own branch" ON public.branch_subscription_plans;
CREATE POLICY "branch_subscription_plans: superadmin own branch"
  ON public.branch_subscription_plans FOR ALL
  USING (branch_id = public.get_my_branch_id())
  WITH CHECK (branch_id = public.get_my_branch_id());

DROP TRIGGER IF EXISTS branch_subscription_plans_updated_at ON public.branch_subscription_plans;
CREATE TRIGGER branch_subscription_plans_updated_at
  BEFORE UPDATE ON public.branch_subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
