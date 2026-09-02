-- Trial Cleanup Lifecycle Columns
-- Tracks when a trialing org's trial expired and when final warning was sent

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_expired_at       timestamptz,
  ADD COLUMN IF NOT EXISTS trial_purge_warning_at timestamptz;

-- Index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_orgs_trial_expired_at
  ON public.organizations (trial_expired_at)
  WHERE subscription_status = 'expired';

COMMENT ON COLUMN public.organizations.trial_expired_at
  IS 'Timestamp when the trial subscription expired. Starts the 37-day countdown to auto-purge.';

COMMENT ON COLUMN public.organizations.trial_purge_warning_at
  IS 'Timestamp when the 7-day final deletion warning email was sent (day 30 after trial_expired_at).';
