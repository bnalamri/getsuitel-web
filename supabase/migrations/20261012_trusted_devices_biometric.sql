-- Trusted devices (web browsers + phones), emailed login codes, fingerprint sign-in.
-- Run once in the Supabase SQL editor.

create table if not exists public.trusted_devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('browser','phone')),
  label         text not null default 'Device',
  token_hash    text not null,            -- sha256 of the random device token (skips the emailed code)
  biometric_hash text,                    -- sha256 of the fingerprint-gated device secret (phone only); null = fingerprint off
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz not null default now()
);
create unique index if not exists trusted_devices_token_idx on public.trusted_devices(token_hash);
create index if not exists trusted_devices_user_idx on public.trusted_devices(user_id);
create index if not exists trusted_devices_bio_idx on public.trusted_devices(biometric_hash) where biometric_hash is not null;

alter table public.trusted_devices enable row level security;
-- Users may read their own devices; all writes go through the API (service role).
drop policy if exists "own devices readable" on public.trusted_devices;
create policy "own devices readable" on public.trusted_devices
  for select using (auth.uid() = user_id);

create table if not exists public.login_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists login_codes_user_idx on public.login_codes(user_id, created_at desc);
alter table public.login_codes enable row level security;  -- no policies: service role only

-- A password change revokes every trusted device and fingerprint for that user.
create or replace function public.revoke_devices_on_password_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    delete from public.trusted_devices where user_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_revoke_devices_on_password_change on auth.users;
create trigger trg_revoke_devices_on_password_change
  after update of encrypted_password on auth.users
  for each row execute function public.revoke_devices_on_password_change();
