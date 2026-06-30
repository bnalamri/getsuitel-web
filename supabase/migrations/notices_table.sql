-- Notices table
create table if not exists public.notices (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id       uuid references public.tenants(id) on delete set null,
  type            text not null check (type in ('late_payment', 'general')),
  subject         text not null,
  body            text not null,
  attachment_url  text,
  created_at      timestamptz not null default now()
);

-- RLS
alter table public.notices enable row level security;

create policy "Org members can manage notices"
  on public.notices
  for all
  using (
    organization_id in (
      select organization_id from public.profiles where id = auth.uid()
    )
  );

-- Storage bucket for attachments (run in Supabase Dashboard > Storage)
-- insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true)
-- on conflict do nothing;

-- Storage policy
-- create policy "Authenticated users can upload attachments"
--   on storage.objects for insert
--   with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

-- create policy "Anyone can read attachments"
--   on storage.objects for select
--   using (bucket_id = 'attachments');
