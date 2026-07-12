-- Staff invitations table for Property Manager and Financial Manager roles
CREATE TABLE IF NOT EXISTS staff_invitations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('property_manager', 'financial_manager')),
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at   TIMESTAMPTZ,
  invited_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_org ON staff_invitations(organization_id);

-- RLS: owner can manage invitations for their org
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages their staff invitations"
ON staff_invitations
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
    AND role = 'owner'
  )
);
