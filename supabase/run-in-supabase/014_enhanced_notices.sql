-- =============================================================
-- Enhanced Notices System — Migration 014
-- Run in: Supabase SQL Editor
-- =============================================================

-- 1. Add recipient_type to existing notices table
--    Supports: 'tenant' (default, existing behaviour) | 'technician'
ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS recipient_type text NOT NULL DEFAULT 'tenant'
    CHECK (recipient_type IN ('tenant', 'technician'));

-- 2. Add technician_id to notices (for technician-targeted notices)
ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. platform_notices — superadmin to owner broadcast
CREATE TABLE IF NOT EXISTS public.platform_notices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  body            text NOT NULL,
  sent_by         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_org_id   uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- NULL = broadcast to ALL owners; set = specific org only
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 4. Track which platform notices each owner has read
CREATE TABLE IF NOT EXISTS public.platform_notice_reads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id       uuid NOT NULL REFERENCES public.platform_notices(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notice_id, user_id)
);

-- 5. RLS for platform_notices
ALTER TABLE public.platform_notices ENABLE ROW LEVEL SECURITY;

-- Superadmin can do everything
CREATE POLICY "Superadmin manages platform_notices"
  ON public.platform_notices
  FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- Owners (and their staff) can read notices addressed to them or broadcast
CREATE POLICY "Owners read their platform_notices"
  ON public.platform_notices
  FOR SELECT
  USING (
    target_org_id IS NULL  -- broadcast to all
    OR
    target_org_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 6. RLS for platform_notice_reads
ALTER TABLE public.platform_notice_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads"
  ON public.platform_notice_reads
  FOR ALL
  USING (user_id = auth.uid());

-- 7. Index for fast unread count
CREATE INDEX IF NOT EXISTS idx_platform_notices_org ON public.platform_notices(target_org_id);
CREATE INDEX IF NOT EXISTS idx_platform_notice_reads_user ON public.platform_notice_reads(user_id);
