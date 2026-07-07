-- ============================================================
-- GetSuitel — Safe Database Cleanup Script
-- Use: Wipe all tenant/owner data while keeping superadmin accounts
-- Safe to run multiple times (uses IF EXISTS / WHERE guards)
--
-- ⚠️  IMPORTANT: Role enum value is 'superadmin' (no underscore)
--     Running this keeps ALL profiles with role = 'superadmin'
-- ============================================================

-- 1. Delete all financial data
DELETE FROM public.payment_receipts;
DELETE FROM public.cheques;
DELETE FROM public.invoices;

-- 2. Delete all operational data
DELETE FROM public.maintenance_requests;
DELETE FROM public.notices;
DELETE FROM public.contracts;

-- 3. Delete all property data
DELETE FROM public.units;
DELETE FROM public.properties;

-- 4. Delete tenants
DELETE FROM public.tenants;

-- 5. Delete all organizations
DELETE FROM public.organizations;

-- 6. Delete audit log (fresh start)
DELETE FROM public.deleted_accounts;

-- 7. Delete non-superadmin profiles
--    NOTE: enum value is 'superadmin' (no underscore) — do not change this
DELETE FROM public.profiles
WHERE role != 'superadmin';

-- 8. Delete non-superadmin auth users
--    Keeps any auth.users whose profile is 'superadmin'
DELETE FROM auth.users
WHERE id NOT IN (
  SELECT id FROM public.profiles WHERE role = 'superadmin'
);

-- ─── Verify what remains ────────────────────────────────────
-- Should show only: superadmin | 1
SELECT role::text, count(*) AS count
FROM public.profiles
GROUP BY role;
