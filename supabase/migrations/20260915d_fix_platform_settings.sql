-- Re-apply the per-superadmin platform_settings migration (idempotent)
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS superadmin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.platform_settings
  DROP CONSTRAINT IF EXISTS platform_settings_key_key;

ALTER TABLE public.platform_settings
  DROP CONSTRAINT IF EXISTS platform_settings_key_superadmin_key;

ALTER TABLE public.platform_settings
  ADD CONSTRAINT platform_settings_key_superadmin_key
  UNIQUE NULLS NOT DISTINCT (key, superadmin_id);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings: own" ON public.platform_settings;
DROP POLICY IF EXISTS "settings: superadmin all" ON public.platform_settings;
DROP POLICY IF EXISTS "Superadmins can read platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Superadmins can write platform settings" ON public.platform_settings;

CREATE POLICY "settings: own"
  ON public.platform_settings FOR ALL
  USING (superadmin_id = auth.uid())
  WITH CHECK (superadmin_id = auth.uid());

NOTIFY pgrst, 'reload schema';

-- confirm
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='platform_settings' AND column_name='superadmin_id';
