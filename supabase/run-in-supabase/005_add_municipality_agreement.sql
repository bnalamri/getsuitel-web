-- GetSuitel: Municipality Agreement document on contracts
-- Run in: Supabase Dashboard → SQL Editor

-- 1. Add column to contracts
alter table public.contracts
  add column if not exists municipality_agreement_url text;

-- 2. Storage bucket for contract documents
-- Run this in Supabase Dashboard → Storage → New bucket:
--   Name: contract-documents
--   Public: true (so signed URLs work without extra auth)
-- OR run via SQL:
insert into storage.buckets (id, name, public)
values ('contract-documents', 'contract-documents', true)
on conflict (id) do nothing;

-- 3. Storage policy — allow authenticated users to insert/update
create policy "Authenticated can upload contract docs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'contract-documents');

create policy "Authenticated can update contract docs"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'contract-documents');

create policy "Public can read contract docs"
  on storage.objects for select
  to public
  using (bucket_id = 'contract-documents');
