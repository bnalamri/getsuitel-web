-- ============================================================
-- GetSuitel — Branch currency awareness for billing/revenue
-- Migration: 20260915l_branch_currency.sql
--
-- Problem (raised by Badar 2026-09-15, after the branch-pricing-plans
-- rollout in 20260915_branch_pricing_plans.sql): every branch now has
-- its own operating currency via branch_subscription_plans.currency
-- (Riyadh = SAR, UAE-Dubai = AED, Oman-Muscat = OMR), but nothing else
-- in the platform knows this:
--
--   1. generateBilling() (src/app/api/hq/billing/route.ts), run monthly
--      by /api/cron/billing, only sums invoices where currency = 'OMR'
--      ("skip foreign-currency for now"). Every non-OMR branch's
--      total_revenue_omr / share_amount_omr comes out as a hard 0,
--      every month, forever — the exact zero-revenue Riyadh/Dubai rows
--      seen on the HQ dashboard.
--   2. Every HQ billing/revenue display hardcodes an OMR label
--      (OmrSymbol / "OMR ...") regardless of which branch the row
--      belongs to.
--
-- Fix: give branches and branch_billing a first-class `currency`
-- column (the branch's own rental/revenue currency). total_revenue
-- and share_amount are both derived from local rental income, so they
-- travel together in that currency. license_fee_omr is left exactly
-- as-is — it is a flat franchise fee HQ sets in its own home currency
-- (OMR), independent of the branch's local rental currency, so it is
-- NOT converted or renamed. Application code must stop adding
-- share_amount + license_fee into one blended number for non-OMR
-- branches, since they are not the same currency.
-- ============================================================

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'OMR';

ALTER TABLE public.branch_billing
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'OMR';

-- Backfill each branch's currency from its own subscription plan
-- overrides (all plans for a given branch share one currency — this
-- is exactly what /pricing and the branch plans editor already assume).
UPDATE public.branches b
SET currency = sub.currency
FROM (
  SELECT DISTINCT ON (branch_id) branch_id, currency
  FROM public.branch_subscription_plans
  ORDER BY branch_id, updated_at DESC
) sub
WHERE sub.branch_id = b.id
  AND sub.currency IS NOT NULL;

-- Backfill existing branch_billing rows from their branch's currency.
UPDATE public.branch_billing bb
SET currency = b.currency
FROM public.branches b
WHERE b.id = bb.branch_id;

NOTIFY pgrst, 'reload schema';
