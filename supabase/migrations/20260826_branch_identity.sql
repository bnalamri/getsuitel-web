-- Branch Identity: allow each superadmin to configure their GetSuitel branch
-- Adds branch_name and branch_logo_url to profiles table

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS branch_name     text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS branch_logo_url text DEFAULT NULL;

COMMENT ON COLUMN profiles.branch_name IS
  'Optional branch label for superadmin accounts, e.g. "Riyadh". Displayed as "GetSuitel — Riyadh Branch".';

COMMENT ON COLUMN profiles.branch_logo_url IS
  'Optional co-brand logo URL for superadmin branch (shown beneath GetSuitel wordmark in sidebar).';
