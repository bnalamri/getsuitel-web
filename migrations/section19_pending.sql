-- ─────────────────────────────────────────────────────────────────────────────
-- Section 18: Platform Config (announcement columns)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE platform_config
  ADD COLUMN IF NOT EXISTS announcement_text     text,
  ADD COLUMN IF NOT EXISTS announcement_severity text DEFAULT 'info';

-- ─────────────────────────────────────────────────────────────────────────────
-- Section 19: Branch Limits + Audit
-- ─────────────────────────────────────────────────────────────────────────────

-- Branch limits (max_units, max_staff, max_tenants were added earlier; add max_orgs)
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS max_units   int,
  ADD COLUMN IF NOT EXISTS max_staff   int,
  ADD COLUMN IF NOT EXISTS max_tenants int,
  ADD COLUMN IF NOT EXISTS max_orgs    int;

-- HQ Audit Log
CREATE TABLE IF NOT EXISTS hq_audit_logs (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id  uuid        REFERENCES branches(id) ON DELETE CASCADE,
  actor_id   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  action     text        NOT NULL,
  details    jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_audit_logs_branch_idx
  ON hq_audit_logs(branch_id, created_at DESC);
