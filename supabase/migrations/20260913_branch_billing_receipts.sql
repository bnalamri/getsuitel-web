-- ============================================================
-- GetSuitel — Branch Billing Receipts
-- Migration: 20260913_branch_billing_receipts.sql
--
-- Today branch_billing.status is flipped 'paid' by HQ manually,
-- with no proof and no audit trail — unlike the tenant→owner
-- payment_receipts flow. This adds the same submit → confirm/
-- reject shape to branch → HQ payments.
-- ============================================================

ALTER TABLE public.branch_billing
  ADD COLUMN IF NOT EXISTS receipt_url       TEXT,
  ADD COLUMN IF NOT EXISTS payment_method    TEXT
    CHECK (payment_method IN ('bank_transfer', 'mobile_transfer', 'cash')),
  ADD COLUMN IF NOT EXISTS submitted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason  TEXT;

-- 'submitted' sits between 'pending' (nothing sent yet) and 'paid'
-- (HQ confirmed). Existing CHECK on status (if any) is widened here;
-- adjust the constraint name if your schema named it differently.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'branch_billing' AND constraint_name = 'branch_billing_status_check'
  ) THEN
    ALTER TABLE public.branch_billing DROP CONSTRAINT branch_billing_status_check;
  END IF;
END $$;

ALTER TABLE public.branch_billing
  ADD CONSTRAINT branch_billing_status_check
  CHECK (status IN ('pending', 'submitted', 'paid', 'rejected'));
