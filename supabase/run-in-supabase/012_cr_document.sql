-- ============================================================
-- GetSuitel — Company CR Document URL
-- Run in: Supabase Dashboard → SQL Editor
--
-- Adds cr_document_url to organizations for storing the
-- uploaded company registration certificate.
-- ============================================================

alter table public.organizations
  add column if not exists cr_document_url text;
