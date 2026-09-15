-- 1) Force PostgREST to pick up any columns added via raw SQL
NOTIFY pgrst, 'reload schema';

-- 2) subscription_plans — every column that should exist:
-- id, slug, name_en, name_ar, desc_en, desc_ar, price_monthly, currency,
-- stripe_price_id, max_properties, max_units, max_tenants, max_staff,
-- trial_days, features_en, features_ar, is_popular, is_active, sort_order,
-- created_at, updated_at
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'subscription_plans'
ORDER BY ordinal_position;

-- 3) branch_subscription_plans — every column that should exist:
-- id, branch_id, slug, name_en, name_ar, desc_en, desc_ar, price_monthly,
-- currency, stripe_price_id, max_properties, max_units, max_tenants,
-- max_staff, trial_days, features_en, features_ar, is_popular, is_active,
-- sort_order, created_at, updated_at
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'branch_subscription_plans'
ORDER BY ordinal_position;
