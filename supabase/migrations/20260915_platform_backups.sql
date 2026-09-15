-- ============================================================
-- GetSuitel — Full Platform Backup mechanism (HQ dashboard)
-- Migration: 20260915_platform_backups.sql
-- Run in Supabase SQL editor
-- ============================================================
-- Context: getsuitel-web runs on the Supabase Free plan, which has NO
-- automated daily backups. This migration + the accompanying app code
-- (src/lib/platform-backup.ts, /api/cron/platform-backup,
-- /api/hq/backups/*, /hq/system/backups) adds a free, self-managed
-- equivalent: a daily full-database logical export to private Storage,
-- listable/downloadable/restorable from the HQ dashboard.

-- ─── 1. platform_backups TABLE ───────────────────────────────
-- One row per backup run (cron or manual). storage_path points at a JSON
-- file in the private 'platform-backups' bucket, never a public bucket —
-- this file contains real customer data across every organization.
CREATE TABLE IF NOT EXISTS public.platform_backups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trigger_type    TEXT NOT NULL DEFAULT 'cron' CHECK (trigger_type IN ('cron', 'manual')),
  triggered_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'error')),
  storage_path    TEXT,
  size_bytes      BIGINT,
  tables_included TEXT[],
  row_counts      JSONB DEFAULT '{}'::jsonb,
  error_msg       TEXT,
  duration_ms     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_platform_backups_created_at ON public.platform_backups (created_at DESC);

-- ─── 2. RLS — service-role only ──────────────────────────────
-- Every read/write goes through server-side API routes using the admin
-- (service role) client, gated by an hq_admin check in application code —
-- same pattern as cron_logs and org_snapshots. No client-side access.
ALTER TABLE public.platform_backups ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies added: RLS with zero policies denies all
-- access to the anon/authenticated roles; the service role bypasses RLS
-- entirely, which is exactly the access split we want here.

-- ─── 3. STORAGE BUCKET — create manually in the dashboard ───
-- This cannot be scripted safely from SQL in all Supabase project
-- configurations, so create it once by hand:
--   Supabase Dashboard → Storage → New bucket
--   Name: platform-backups
--   Public: OFF  (must stay private — full customer data lives here)
-- Do NOT add any storage.objects policies for this bucket (unlike
-- receipts/subscription-proofs). No policies + private bucket means only
-- the service-role admin client can read or write it; downloads are only
-- ever issued as short-lived signed URLs from /api/hq/backups/[id]/download,
-- gated to hq_admin.
