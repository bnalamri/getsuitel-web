-- ============================================================
-- GetSuitel — Owner Type (Individual vs Company)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Adds:
--   organizations.owner_type   — 'individual' | 'company'
--   organizations.cr_number    — Commercial Registration number (companies)
--   organizations.authorized_rep — Authorized representative name (companies)
--   profiles.national_id       — National ID / passport (individual owners)
-- ============================================================

alter table public.organizations
  add column if not exists owner_type       text not null default 'individual'
    check (owner_type in ('individual', 'company')),
  add column if not exists cr_number        text,
  add column if not exists authorized_rep   text;

alter table public.profiles
  add column if not exists national_id      text;
