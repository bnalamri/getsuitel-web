-- ─────────────────────────────────────────────────────────────────────────────
-- utility_bills: support General (property-level) bills
-- • unit_id becomes nullable (general bills have no unit)
-- • add utility_scope, property_id, account columns, attachment_url
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Make unit_id nullable (was NOT NULL — blocks general bills)
ALTER TABLE utility_bills
  ALTER COLUMN unit_id DROP NOT NULL;

-- 2. Add utility_scope column
ALTER TABLE utility_bills
  ADD COLUMN IF NOT EXISTS utility_scope TEXT NOT NULL DEFAULT 'unit'
    CHECK (utility_scope IN ('unit', 'general'));

-- 3. Add property_id for general (property-level) bills
ALTER TABLE utility_bills
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE CASCADE;

-- 4. Add account detail columns (auto-filled from utility_accounts)
ALTER TABLE utility_bills
  ADD COLUMN IF NOT EXISTS consumer_no   TEXT,
  ADD COLUMN IF NOT EXISTS meter_number  TEXT,
  ADD COLUMN IF NOT EXISTS service_type  TEXT,
  ADD COLUMN IF NOT EXISTS recharge_code TEXT,
  ADD COLUMN IF NOT EXISTS tariff_type   TEXT;

-- 5. Add attachment support
ALTER TABLE utility_bills
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 6. Index for property-level lookups
CREATE INDEX IF NOT EXISTS idx_utility_bills_property
  ON utility_bills (property_id)
  WHERE property_id IS NOT NULL;
