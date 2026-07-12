-- Migration 005: Data retention — canceled_at + deleted_accounts audit log

-- 1. Add canceled_at to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

-- 2. Create deleted_accounts audit table
CREATE TABLE IF NOT EXISTS deleted_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID,                        -- original org id (for reference only)
  org_name        TEXT NOT NULL,
  org_name_ar     TEXT,
  owner_name      TEXT,
  owner_email     TEXT,
  owner_phone     TEXT,
  plan            TEXT,
  units_count     INT DEFAULT 0,
  tenants_count   INT DEFAULT 0,
  joined_at       TIMESTAMPTZ,
  canceled_at     TIMESTAMPTZ,
  purged_at       TIMESTAMPTZ DEFAULT NOW(),
  purged_by       TEXT DEFAULT 'auto',         -- 'auto' = cron, or admin email
  reason          TEXT DEFAULT 'auto_purge_90_days',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: only super_admin can read deleted_accounts
ALTER TABLE deleted_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_deleted_accounts"
  ON deleted_accounts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );
