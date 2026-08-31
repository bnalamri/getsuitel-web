-- ============================================================
-- invite_codes — branch superadmin invitation system
-- Run this in the Supabase SQL editor
-- ============================================================

create table if not exists invite_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  branch_id   uuid not null references branches(id) on delete cascade,
  created_by  uuid not null references profiles(id),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  used_by     uuid references profiles(id),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

alter table invite_codes enable row level security;

-- hq_admin can do everything (create, read, delete)
create policy "hq_admin full access on invite_codes" on invite_codes
  for all to authenticated
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'hq_admin')
  )
  with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'hq_admin')
  );

-- Any authenticated user can read an unused, non-expired code (needed during registration validation)
create policy "any authenticated can read unused codes" on invite_codes
  for select to authenticated
  using (used_by is null and expires_at > now());
