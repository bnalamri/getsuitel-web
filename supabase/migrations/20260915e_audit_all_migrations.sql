-- Audit: does every table/column that a migration was supposed to add actually exist?
-- Run this whole block, then look for any row where status = 'MISSING'.

SELECT * FROM (
  SELECT 'TABLE' AS kind, 'branch_billing' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='branch_billing')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'branch_feature_flags' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='branch_feature_flags')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'branch_subscription_plans' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='branch_subscription_plans')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'branches' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='branches')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'cheques' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cheques')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'deleted_accounts' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='deleted_accounts')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'hq_invitations' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hq_invitations')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'hq_notices' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hq_notices')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'invite_codes' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invite_codes')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'notices' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notices')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'org_feature_flags' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='org_feature_flags')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'payment_receipts' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payment_receipts')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'platform_backups' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='platform_backups')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'platform_feature_flags' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='platform_feature_flags')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'staff_invitations' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='staff_invitations')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'subscription_plans' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscription_plans')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'tenancy_agreement_templates' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenancy_agreement_templates')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'utility_accounts' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='utility_accounts')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'TABLE' AS kind, 'utility_bills' AS table_name, NULL::text AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='utility_bills')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'branch_agreements' AS table_name, 'hq_legal_name_ar' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='branch_agreements' AND column_name='hq_legal_name_ar')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'branch_agreements' AS table_name, 'hq_obligations_ar' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='branch_agreements' AND column_name='hq_obligations_ar')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'branch_billing' AS table_name, 'receipt_url' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='branch_billing' AND column_name='receipt_url')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'contracts' AS table_name, 'last_cheque_alert_sent_at' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contracts' AND column_name='last_cheque_alert_sent_at')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'contracts' AS table_name, 'notes_ar' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contracts' AND column_name='notes_ar')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'contracts' AS table_name, 'utilities_config' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='contracts' AND column_name='utilities_config')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'invoices' AS table_name, 'paid_via' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='paid_via')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'invoices' AS table_name, 'payment_method' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='invoices' AND column_name='payment_method')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'organizations' AS table_name, 'bank_account_name' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='bank_account_name')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'organizations' AS table_name, 'bank_transfer_mode' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='bank_transfer_mode')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'organizations' AS table_name, 'branch_id' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='branch_id')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'organizations' AS table_name, 'canceled_at' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='canceled_at')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'organizations' AS table_name, 'cr_document_url' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='cr_document_url')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'organizations' AS table_name, 'max_properties' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='max_properties')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'organizations' AS table_name, 'owner_type' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='owner_type')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'organizations' AS table_name, 'trial_expired_at' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='trial_expired_at')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'platform_config' AS table_name, 'hq_bank_name' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='platform_config' AND column_name='hq_bank_name')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'platform_config' AS table_name, 'hq_bank_transfer_mode' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='platform_config' AND column_name='hq_bank_transfer_mode')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'platform_config' AS table_name, 'hq_contact_email' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='platform_config' AND column_name='hq_contact_email')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'platform_settings' AS table_name, 'superadmin_id' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='platform_settings' AND column_name='superadmin_id')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'profiles' AS table_name, 'branch_name' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='branch_name')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'profiles' AS table_name, 'national_id' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='national_id')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'properties' AS table_name, 'address_line2' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='address_line2')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'properties' AS table_name, 'branch_id' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='properties' AND column_name='branch_id')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'subscription_plans' AS table_name, 'currency' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_plans' AND column_name='currency')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'units' AS table_name, 'floor_plan_url' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='units' AND column_name='floor_plan_url')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'units' AS table_name, 'unit_type' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='units' AND column_name='unit_type')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'utility_accounts' AS table_name, 'label' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='utility_accounts' AND column_name='label')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'utility_accounts' AS table_name, 'tank_number' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='utility_accounts' AND column_name='tank_number')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'utility_bills' AS table_name, 'attachment_url' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='utility_bills' AND column_name='attachment_url')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'utility_bills' AS table_name, 'consumer_no' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='utility_bills' AND column_name='consumer_no')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'utility_bills' AS table_name, 'property_id' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='utility_bills' AND column_name='property_id')
      THEN 'ok' ELSE 'MISSING' END AS status
  UNION ALL
  SELECT 'COLUMN' AS kind, 'utility_bills' AS table_name, 'utility_scope' AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='utility_bills' AND column_name='utility_scope')
      THEN 'ok' ELSE 'MISSING' END AS status
) x ORDER BY status DESC, kind, table_name, column_name;
