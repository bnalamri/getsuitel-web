-- ═══════════════════════════════════════════════════════════════════════════
-- Fix tenant_portal flag description to reflect its actual behavior
-- (full kill-switch that blocks tenant login/portal access entirely, not
-- just "view contracts, pay invoices online" — that undersold it).
-- Run in Supabase SQL Editor (Project → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE platform_feature_flags
SET description = 'Master switch — when off, tenants are blocked from logging in / using the app entirely'
WHERE feature_key = 'tenant_portal';
