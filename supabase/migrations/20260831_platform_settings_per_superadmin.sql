-- ============================================================
-- GetSuitel — Per-superadmin Platform Settings
-- Migration: 20260831_platform_settings_per_superadmin.sql
--
-- Problem: platform_settings table had a single UNIQUE(key) constraint,
--   meaning all branch superadmins shared the same global settings.
--
-- Fix: Add superadmin_id column, change unique constraint to (key, superadmin_id),
--   and add RLS so each superadmin only reads/writes their own rows.
--
-- After running this:
--   - Each superadmin has independent currency, timezone, date format, etc.
--   - HQ (no branch) still has rows with superadmin_id = their own user ID
--   - Existing rows (if any) get NULL superadmin_id and become "orphaned" —
--     they'll no longer be visible via RLS; re-save from Settings UI to re-create
-- ============================================================

-- 1. Add superadmin_id column
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS superadmin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Drop old unique constraint (key only)
ALTER TABLE public.platform_settings
  DROP CONSTRAINT IF EXISTS platform_settings_key_key;

-- 3. Add new unique constraint: (key, superadmin_id) — NULLS NOT DISTINCT
--    requires PostgreSQL 15+ (Supabase uses 15+)
ALTER TABLE public.platform_settings
  ADD CONSTRAINT platform_settings_key_superadmin_key
  UNIQUE NULLS NOT DISTINCT (key, superadmin_id);

-- 4. Enable RLS (if not already)
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- 5. Drop any existing policies
DROP POLICY IF EXISTS "settings: own" ON public.platform_settings;
DROP POLICY IF EXISTS "settings: superadmin all" ON public.platform_settings;
DROP POLICY IF EXISTS "Superadmins can read platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Superadmins can write platform settings" ON public.platform_settings;

-- 6. Each superadmin can only access their own rows
CREATE POLICY "settings: own"
  ON public.platform_settings FOR ALL
  USING (superadmin_id = auth.uid())
  WITH CHECK (superadmin_id = auth.uid());
