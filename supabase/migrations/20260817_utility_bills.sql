-- Add utilities responsibility config to contracts
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS utilities_config JSONB DEFAULT '{"water_electricity":"owner","internet":"owner"}'::jsonb;

-- Create utility_bills table
CREATE TABLE IF NOT EXISTS utility_bills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id         UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  contract_id     UUID REFERENCES contracts(id) ON DELETE SET NULL,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  utility_type    TEXT NOT NULL CHECK (utility_type IN ('water_electricity', 'internet')),
  bill_date       DATE NOT NULL,
  due_date        DATE NOT NULL,
  amount          NUMERIC(12,3) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'OMR',
  billed_to       TEXT NOT NULL CHECK (billed_to IN ('tenant', 'owner')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'expense_recorded')),
  invoice_id      UUID REFERENCES invoices(id) ON DELETE SET NULL,
  expense_id      UUID REFERENCES expenses(id) ON DELETE SET NULL,
  meter_from      NUMERIC(12,2),
  meter_to        NUMERIC(12,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE utility_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view utility_bills"
  ON utility_bills FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "owners and managers can insert utility_bills"
  ON utility_bills FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner','property_manager','manager','financial_manager')
    )
  );

CREATE POLICY "owners and managers can update utility_bills"
  ON utility_bills FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner','property_manager','manager','financial_manager')
    )
  );

CREATE POLICY "owners can delete utility_bills"
  ON utility_bills FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner','manager')
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_utility_bills_org ON utility_bills(organization_id);
CREATE INDEX IF NOT EXISTS idx_utility_bills_unit ON utility_bills(unit_id);
