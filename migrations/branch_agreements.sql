-- Branch Legal Agreements
CREATE TABLE IF NOT EXISTS branch_agreements (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id            uuid        REFERENCES branches(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- HQ party details
  hq_legal_name        text,
  hq_address           text,
  hq_registration      text,
  hq_representative    text,

  -- Branch party details
  branch_legal_name    text,
  branch_address       text,
  branch_registration  text,
  branch_representative text,

  -- Commercial terms
  effective_date       date,
  duration_years       int  DEFAULT 1,
  payment_due_day      int  DEFAULT 1,
  notice_period_days   int  DEFAULT 30,
  auto_renewal         boolean DEFAULT true,

  -- Obligations (free text)
  hq_obligations       text,
  branch_obligations   text,

  -- Governing law
  jurisdiction         text DEFAULT 'Sultanate of Oman',
  governing_law        text DEFAULT 'Laws of the Sultanate of Oman',
  dispute_resolution   text DEFAULT 'Commercial Court of Muscat',

  -- Custom clauses
  custom_clauses       text,

  -- Status tracking
  exported_at          timestamptz,
  signed_doc_url       text,
  signed_doc_name      text,
  signed_at            timestamptz,

  -- Meta
  created_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- RLS: only HQ roles can access
ALTER TABLE branch_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hq_agreement_access" ON branch_agreements
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('hq_admin', 'hq_finance', 'hq_staff')
    )
  );

-- NOTE: Signed documents are stored in Supabase Storage bucket "documents"
-- under path branch-agreements/{branch_id}/signed_{timestamp}.{ext}
-- Make sure the "documents" bucket exists in Supabase Storage and has RLS
-- enabled. HQ roles can read/write via the server-side admin client (service key).
-- If the bucket does not exist, create it in Supabase Dashboard → Storage → New bucket
-- Name: documents, Public: false (private, signed URLs served via service key)
