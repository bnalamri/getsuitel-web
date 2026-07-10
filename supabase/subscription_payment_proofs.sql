-- Run this in Supabase SQL Editor
-- Creates table for subscription payment proofs submitted by owners

create table if not exists subscription_payment_proofs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  owner_email     text,
  owner_name      text,
  plan            text,
  receipt_url     text not null,
  notes           text,
  status          text not null default 'pending',  -- pending | reviewed
  submitted_at    timestamptz not null default now()
);

-- Index for admin dashboard query (pending proofs)
create index if not exists idx_sub_proofs_status on subscription_payment_proofs(status);
create index if not exists idx_sub_proofs_org    on subscription_payment_proofs(organization_id);

-- RLS: only service role (admin client) can read/write
alter table subscription_payment_proofs enable row level security;

-- Allow insert from authenticated users (owner submits their own)
create policy "owners can insert own proofs" on subscription_payment_proofs
  for insert to authenticated
  with check (true);

-- Admin client (service_role) bypasses RLS automatically
