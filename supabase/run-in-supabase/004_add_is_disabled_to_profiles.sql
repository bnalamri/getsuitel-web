-- GetSuitel: add is_disabled flag to profiles for admin user management
-- Run in: Supabase Dashboard → SQL Editor

alter table public.profiles
  add column if not exists is_disabled boolean not null default false;
