-- ============================================================
-- GetSuitel — Arabic Party Identity Fields on Branch Agreements
-- Run in: Supabase Dashboard → SQL Editor
--
-- Follow-up to 20260907_bilingual_agreement_templates.sql. That migration
-- covered the legal PROSE (obligations, governing law, clauses); this one
-- covers party IDENTITY — legal name, address, authorised representative.
--
-- In Oman/GCC, the Arabic legal name on a Commercial Registration is the
-- officially registered name, not a transliteration of the English one —
-- so mirroring the English value into an RTL-flipped box (what the first
-- pass did) was wrong for these fields specifically. Same applies to
-- registered addresses and representative names on official paperwork.
-- Commercial Registration NUMBER is left as a single field — it's a
-- number, not language-dependent.
-- ============================================================

alter table public.branch_agreements
  add column if not exists hq_legal_name_ar         text,
  add column if not exists hq_address_ar             text,
  add column if not exists hq_representative_ar      text,
  add column if not exists branch_legal_name_ar      text,
  add column if not exists branch_address_ar         text,
  add column if not exists branch_representative_ar  text;

comment on column public.branch_agreements.hq_legal_name_ar is
  'Officially registered Arabic legal name of HQ (CR name), not a translation of hq_legal_name.';
comment on column public.branch_agreements.branch_legal_name_ar is
  'Officially registered Arabic legal name of the Branch (CR name), not a translation of branch_legal_name.';
