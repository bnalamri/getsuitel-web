-- HQ Invitations — for inviting hq_staff members
CREATE TABLE IF NOT EXISTS hq_invitations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  invited_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hq_invitations_token ON hq_invitations(token);
CREATE INDEX IF NOT EXISTS idx_hq_invitations_email ON hq_invitations(email);

ALTER TABLE hq_invitations ENABLE ROW LEVEL SECURITY;

-- hq_admin can manage all invitations
CREATE POLICY "hq_admin manages hq invitations"
ON hq_invitations FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'hq_admin'
  )
);
