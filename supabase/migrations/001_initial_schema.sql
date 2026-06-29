-- ============================================================
-- GetSuitel — Initial Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";      -- for fuzzy search

-- ─── ENUMS ──────────────────────────────────────────────────────────────────

create type user_role as enum ('superadmin', 'owner', 'tenant', 'technician');
create type subscription_plan as enum ('basic', 'pro', 'enterprise');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');
create type property_type as enum ('residential', 'commercial', 'mixed');
create type unit_status as enum ('vacant', 'occupied', 'maintenance', 'reserved');
create type contract_status as enum ('draft', 'active', 'expired', 'terminated');
create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'canceled');
create type invoice_type as enum ('rent', 'deposit', 'maintenance', 'other');
create type maintenance_priority as enum ('low', 'medium', 'high', 'urgent');
create type maintenance_status as enum ('open', 'assigned', 'in_progress', 'completed', 'canceled');
create type maintenance_category as enum ('plumbing', 'electrical', 'hvac', 'structural', 'appliance', 'cleaning', 'other');
create type notification_type as enum (
  'invoice_created', 'invoice_paid', 'invoice_overdue',
  'maintenance_created', 'maintenance_assigned', 'maintenance_completed',
  'contract_expiring', 'contract_expired', 'lease_renewal', 'general'
);
create type document_category as enum ('contract', 'id', 'invoice', 'report', 'other');
create type lang_pref as enum ('ar', 'en');

-- ─── PROFILES ───────────────────────────────────────────────────────────────
-- Extends Supabase auth.users. Created automatically via trigger on signup.

create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null unique,
  full_name         text not null,
  full_name_ar      text,
  role              user_role not null default 'owner',
  phone             text,
  avatar_url        text,
  lang_pref         lang_pref not null default 'en',
  is_active         boolean not null default true,
  organization_id   uuid,                          -- set after org created
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── ORGANIZATIONS ──────────────────────────────────────────────────────────

create table public.organizations (
  id                        uuid primary key default uuid_generate_v4(),
  name                      text not null,
  name_ar                   text,
  owner_id                  uuid not null references public.profiles(id) on delete restrict,
  logo_url                  text,
  subscription_plan         subscription_plan not null default 'basic',
  subscription_status       subscription_status not null default 'trialing',
  subscription_ends_at      timestamptz,
  trial_ends_at             timestamptz default (now() + interval '30 days'),
  stripe_customer_id        text unique,
  stripe_subscription_id    text unique,
  max_units                 int not null default 10,
  max_tenants               int not null default 15,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Back-fill FK on profiles after organizations table exists
alter table public.profiles
  add constraint profiles_organization_id_fkey
  foreign key (organization_id) references public.organizations(id) on delete set null;

-- ─── PROPERTIES ─────────────────────────────────────────────────────────────

create table public.properties (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  name_ar          text,
  type             property_type not null default 'residential',
  address          text not null,
  city             text not null,
  country          text not null default 'Oman',
  total_units      int not null default 0,
  image_url        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── UNITS ──────────────────────────────────────────────────────────────────

create table public.units (
  id               uuid primary key default uuid_generate_v4(),
  property_id      uuid not null references public.properties(id) on delete cascade,
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  unit_number      text not null,
  floor            int,
  area_sqm         numeric(8,2),
  bedrooms         int,
  bathrooms        int,
  status           unit_status not null default 'vacant',
  rent_amount      numeric(12,2) not null default 0,
  currency         text not null default 'OMR',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique(property_id, unit_number)
);

-- ─── TENANTS ────────────────────────────────────────────────────────────────

create table public.tenants (
  id                uuid primary key default uuid_generate_v4(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  profile_id        uuid references public.profiles(id) on delete set null,
  full_name         text not null,
  full_name_ar      text,
  email             text not null,
  phone             text not null,
  national_id       text,
  nationality       text,
  emergency_contact text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── CONTRACTS ──────────────────────────────────────────────────────────────

create table public.contracts (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  unit_id          uuid not null references public.units(id) on delete restrict,
  tenant_id        uuid not null references public.tenants(id) on delete restrict,
  start_date       date not null,
  end_date         date not null,
  rent_amount      numeric(12,2) not null,
  currency         text not null default 'OMR',
  payment_day      int not null default 1 check (payment_day between 1 and 28),
  deposit_amount   numeric(12,2) not null default 0,
  status           contract_status not null default 'draft',
  pdf_url          text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── INVOICES ───────────────────────────────────────────────────────────────

create table public.invoices (
  id                        uuid primary key default uuid_generate_v4(),
  organization_id           uuid not null references public.organizations(id) on delete cascade,
  contract_id               uuid references public.contracts(id) on delete set null,
  tenant_id                 uuid not null references public.tenants(id) on delete restrict,
  unit_id                   uuid not null references public.units(id) on delete restrict,
  type                      invoice_type not null default 'rent',
  amount                    numeric(12,2) not null,
  currency                  text not null default 'OMR',
  due_date                  date not null,
  paid_date                 date,
  status                    invoice_status not null default 'draft',
  stripe_payment_intent_id  text,
  pdf_url                   text,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- ─── MAINTENANCE REQUESTS ───────────────────────────────────────────────────

create table public.maintenance_requests (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  unit_id          uuid not null references public.units(id) on delete restrict,
  tenant_id        uuid references public.tenants(id) on delete set null,
  technician_id    uuid references public.profiles(id) on delete set null,
  title            text not null,
  description      text not null,
  category         maintenance_category not null default 'other',
  priority         maintenance_priority not null default 'medium',
  status           maintenance_status not null default 'open',
  scheduled_date   timestamptz,
  completed_date   timestamptz,
  cost             numeric(10,2),
  notes            text,
  images           text[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        notification_type not null default 'general',
  title       text not null,
  title_ar    text,
  body        text not null,
  body_ar     text,
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── DOCUMENTS ──────────────────────────────────────────────────────────────

create table public.documents (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  uploaded_by      uuid not null references public.profiles(id) on delete restrict,
  related_id       uuid,
  related_type     text,        -- 'contract' | 'tenant' | 'unit' etc.
  name             text not null,
  category         document_category not null default 'other',
  file_url         text not null,
  file_size        bigint not null default 0,
  mime_type        text not null,
  created_at       timestamptz not null default now()
);

-- ─── INDEXES ────────────────────────────────────────────────────────────────

create index on public.properties(organization_id);
create index on public.units(property_id);
create index on public.units(organization_id);
create index on public.units(status);
create index on public.tenants(organization_id);
create index on public.tenants(profile_id);
create index on public.contracts(organization_id);
create index on public.contracts(unit_id);
create index on public.contracts(tenant_id);
create index on public.contracts(status);
create index on public.contracts(end_date);
create index on public.invoices(organization_id);
create index on public.invoices(tenant_id);
create index on public.invoices(status);
create index on public.invoices(due_date);
create index on public.maintenance_requests(organization_id);
create index on public.maintenance_requests(technician_id);
create index on public.maintenance_requests(status);
create index on public.notifications(user_id);
create index on public.notifications(is_read);
create index on public.documents(organization_id);

-- ─── AUTO-UPDATE updated_at ─────────────────────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated_at       before update on public.profiles          for each row execute function public.handle_updated_at();
create trigger trg_organizations_updated_at  before update on public.organizations     for each row execute function public.handle_updated_at();
create trigger trg_properties_updated_at     before update on public.properties        for each row execute function public.handle_updated_at();
create trigger trg_units_updated_at          before update on public.units             for each row execute function public.handle_updated_at();
create trigger trg_tenants_updated_at        before update on public.tenants           for each row execute function public.handle_updated_at();
create trigger trg_contracts_updated_at      before update on public.contracts         for each row execute function public.handle_updated_at();
create trigger trg_invoices_updated_at       before update on public.invoices          for each row execute function public.handle_updated_at();
create trigger trg_maintenance_updated_at    before update on public.maintenance_requests for each row execute function public.handle_updated_at();

-- ─── AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, lang_pref)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'owner'),
    coalesce((new.raw_user_meta_data->>'lang_pref')::lang_pref, 'en')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
