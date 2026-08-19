-- ─────────────────────────────────────────────────────────────────────────────
-- utility_accounts — stores Consumer No., Meter Number, Recharge Code, etc.
-- per unit (unit-level bills) and per property with no unit (general bills).
-- Auto-populated in the utility bill form when a unit/property+type is chosen.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS utility_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id         UUID REFERENCES units(id) ON DELETE CASCADE,
  -- NULL unit_id  = general / property-level account (no specific unit)
  -- non-NULL      = unit-level account
  utility_type    TEXT NOT NULL CHECK (utility_type IN ('water', 'electricity', 'internet')),
  consumer_no     TEXT,
  meter_number    TEXT,
  recharge_code   TEXT,
  tariff_type     TEXT,
  service_type    TEXT DEFAULT 'postpaid' CHECK (service_type IN ('prepaid', 'postpaid', 'fiber')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one account per (unit, utility_type) for unit-level accounts
CREATE UNIQUE INDEX IF NOT EXISTS idx_utility_accounts_unit_type
  ON utility_accounts (unit_id, utility_type)
  WHERE unit_id IS NOT NULL;

-- Unique constraint: one account per (property, utility_type) for general accounts
CREATE UNIQUE INDEX IF NOT EXISTS idx_utility_accounts_property_general
  ON utility_accounts (property_id, utility_type)
  WHERE unit_id IS NULL;

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_utility_accounts_org
  ON utility_accounts (organization_id);

CREATE INDEX IF NOT EXISTS idx_utility_accounts_property
  ON utility_accounts (property_id);

-- RLS
ALTER TABLE utility_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view utility_accounts"
  ON utility_accounts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "owners and managers can insert utility_accounts"
  ON utility_accounts FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner','property_manager','manager','financial_manager')
    )
  );

CREATE POLICY "owners and managers can update utility_accounts"
  ON utility_accounts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner','property_manager','manager','financial_manager')
    )
  );

CREATE POLICY "owners can delete utility_accounts"
  ON utility_accounts FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner','manager')
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_utility_accounts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_utility_accounts_updated_at
  BEFORE UPDATE ON utility_accounts
  FOR EACH ROW EXECUTE FUNCTION update_utility_accounts_updated_at();
