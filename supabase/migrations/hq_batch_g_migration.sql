-- ═══════════════════════════════════════════════════════════════════════════
-- Batch G Migration — platform_feature_flags + hq_notices
-- Run in Supabase SQL Editor (Project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. platform_feature_flags ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_feature_flags (
  feature_key        TEXT PRIMARY KEY,
  label              TEXT        NOT NULL,
  description        TEXT,
  enabled_globally   BOOLEAN     NOT NULL DEFAULT TRUE,
  branch_overrides   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at         TIMESTAMPTZ          DEFAULT now()
);

-- Seed default flags
INSERT INTO platform_feature_flags (feature_key, label, description, enabled_globally) VALUES
  ('cheque_payments',    'Cheque Payments',       'Allow tenants to pay invoices via cheque',            true),
  ('bank_transfer',      'Bank Transfer',          'Allow tenants to pay via bank transfer',              true),
  ('mobile_wallet',      'Mobile Wallet',          'Allow tenants to pay via mobile wallet',              true),
  ('expense_tracking',   'Expense Tracking',       'Owner expense management module',                     true),
  ('utility_bills',      'Utility Bills',          'Utility bill tracking and reporting per unit',        true),
  ('staff_invitations',  'Staff Invitations',      'Owners can invite property / financial managers',     true),
  ('tenant_portal',      'Tenant Self-Service',    'Tenant can view contracts, pay invoices online',      true),
  ('maintenance',        'Maintenance Requests',   'Tenant maintenance request submission and tracking',  true),
  ('notices_system',     'Notices & Alerts',       'Owner can send broadcast notices to tenants',         true)
ON CONFLICT (feature_key) DO NOTHING;

ALTER TABLE platform_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HQ admin full access to platform_feature_flags" ON platform_feature_flags;
CREATE POLICY "HQ admin full access to platform_feature_flags"
  ON platform_feature_flags FOR ALL
  TO authenticated
  USING  (is_hq_admin())
  WITH CHECK (is_hq_admin());

-- ── 2. hq_notices ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hq_notices (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL,
  body              TEXT        NOT NULL,
  priority          TEXT        NOT NULL DEFAULT 'normal'
                                  CHECK (priority IN ('normal', 'high', 'urgent')),
  target_branch_ids UUID[]               DEFAULT NULL,  -- NULL = all branches
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ          DEFAULT now(),
  expires_at        TIMESTAMPTZ          DEFAULT NULL
);

ALTER TABLE hq_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HQ admin full access to hq_notices" ON hq_notices;
CREATE POLICY "HQ admin full access to hq_notices"
  ON hq_notices FOR ALL
  TO authenticated
  USING  (is_hq_admin())
  WITH CHECK (is_hq_admin());

DROP POLICY IF EXISTS "Branch superadmin reads their hq_notices" ON hq_notices;
CREATE POLICY "Branch superadmin reads their hq_notices"
  ON hq_notices FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    AND (
      target_branch_ids IS NULL
      OR (
        SELECT id FROM branches
        WHERE superadmin_id = auth.uid()
        LIMIT 1
      ) = ANY(target_branch_ids)
    )
    AND (expires_at IS NULL OR expires_at > now())
  );
