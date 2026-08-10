-- ─── CHEQUE ALERT MIGRATION ──────────────────────────────────────────────────
-- Adds last_cheque_alert_sent_at to contracts so the cron doesn't re-alert
-- within 30 days of a previous alert for the same contract.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS last_cheque_alert_sent_at timestamptz;
