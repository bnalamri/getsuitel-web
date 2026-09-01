-- Add HQ contact email to platform_config (configurable from HQ Settings)
ALTER TABLE platform_config
  ADD COLUMN IF NOT EXISTS hq_contact_email TEXT NOT NULL DEFAULT 'hq_admin@getsuitel.com';

UPDATE platform_config
  SET hq_contact_email = 'hq_admin@getsuitel.com'
  WHERE id = 1 AND hq_contact_email = 'hq_admin@getsuitel.com';
