-- Run this in Supabase SQL Editor
-- Adds upload (INSERT) policies for both storage buckets
-- Public bucket setting only covers reads — uploads need explicit policies

-- Allow any authenticated user to upload to receipts bucket
create policy "allow authenticated uploads receipts"
on storage.objects for insert
to authenticated
with check (bucket_id = 'receipts');

-- Allow any authenticated user to upload to subscription-proofs bucket
create policy "allow authenticated uploads subscription-proofs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'subscription-proofs');

-- Allow users to update/replace their own uploads (needed for upsert:true)
create policy "allow authenticated updates receipts"
on storage.objects for update
to authenticated
using (bucket_id = 'receipts');

create policy "allow authenticated updates subscription-proofs"
on storage.objects for update
to authenticated
using (bucket_id = 'subscription-proofs');
