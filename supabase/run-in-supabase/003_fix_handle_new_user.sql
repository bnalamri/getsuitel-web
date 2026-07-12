-- ============================================================
-- GetSuitel — Fix handle_new_user trigger
-- Run in: Supabase Dashboard → SQL Editor
--
-- What this fixes:
-- 1. Owners: auto-creates an organization from org_name metadata
--    and sets profile.organization_id
-- 2. Tenants/Technicians: sets profile.organization_id from
--    organization_id metadata (passed via invite code flow)
-- 3. Individual owners: saves national_id to profiles
-- 4. Company owners: saves owner_type, cr_number, authorized_rep to organizations
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role           user_role;
  v_org_id         uuid;
  v_org_name       text;
  v_plan           subscription_plan;
  v_owner_type     text;
  v_cr_number      text;
  v_authorized_rep text;
  v_national_id    text;
begin
  -- Extract metadata
  v_role           := coalesce((new.raw_user_meta_data->>'role')::user_role, 'owner');
  v_org_name       := new.raw_user_meta_data->>'org_name';
  v_org_id         := (new.raw_user_meta_data->>'organization_id')::uuid;
  v_plan           := coalesce((new.raw_user_meta_data->>'plan')::subscription_plan, 'basic');
  v_owner_type     := coalesce(new.raw_user_meta_data->>'owner_type', 'individual');
  v_cr_number      := new.raw_user_meta_data->>'cr_number';
  v_authorized_rep := new.raw_user_meta_data->>'authorized_rep';
  v_national_id    := new.raw_user_meta_data->>'national_id';

  -- Insert profile first (organization_id may be null initially)
  insert into public.profiles (id, email, full_name, role, phone, lang_pref, national_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_role,
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'lang_pref')::lang_pref, 'en'),
    case when v_role = 'owner' and v_owner_type = 'individual' then v_national_id else null end
  );

  -- For owners: create organization and link it
  if v_role = 'owner' and v_org_name is not null then
    insert into public.organizations (
      name, owner_id, subscription_plan, subscription_status, trial_e