-- GetSuitel: handle_new_user trigger — FINAL WORKING VERSION
-- Root cause fix: user_role enum was dropped (role col is now text), removed ::user_role cast.
-- lang_pref and subscription_plan enums still exist, kept as ::public.lang_pref / ::public.subscription_plan
-- 2026-07-12: Added max_properties to org insert (was missing, defaulting to 2 for all plans)
-- Run in: Supabase Dashboard → SQL Editor

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $func$
declare
  v_role           text;
  v_org_id         uuid;
  v_org_name       text;
  v_plan           text;
  v_owner_type     text;
  v_cr_number      text;
  v_authorized_rep text;
  v_national_id    text;
begin
  v_role           := coalesce(new.raw_user_meta_data->>'role', 'owner');
  v_org_name       := new.raw_user_meta_data->>'org_name';
  v_org_id         := (new.raw_user_meta_data->>'organization_id')::uuid;
  v_plan           := coalesce(new.raw_user_meta_data->>'plan', 'basic');
  v_owner_type     := coalesce(new.raw_user_meta_data->>'owner_type', 'individual');
  v_cr_number      := new.raw_user_meta_data->>'cr_number';
  v_authorized_rep := new.raw_user_meta_data->>'authorized_rep';
  v_national_id    := new.raw_user_meta_data->>'national_id';

  insert into public.profiles (id, email, full_name, role, phone, lang_pref, national_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_role,
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'lang_pref', 'en')::public.lang_pref,
    case when v_role = 'owner' and v_owner_type = 'individual' then v_national_id else null end
  );

  if v_role = 'owner' and v_org_name is not null then
    insert into public.organizations (
      name, owner_id, subscription_plan, subscription_status, trial_ends_at,
      max_properties, max_units, max_tenants, owner_type, cr_number, authorized_rep
    )
    values (
      v_org_name,
      new.id,
      v_plan::public.subscription_plan,
      'trialing',
      now() + interval '30 days',
      case v_plan when 'basic' then 2 when 'pro' then 10 else 20 end,
      case v_plan when 'basic' then 10 when 'pro' then 50 else 9999 end,
      case v_plan when 'basic' then 15 when 'pro' then 100 else 9999 end,
      v_owner_type,
      case when v_owner_type = 'company' then v_cr_number else null end,
      case when v_owner_type = 'company' then v_authorized_rep else null end
    )
    returning id into v_org_id;

    update public.profiles set organization_id = v_org_id where id = new.id;
  end if;

  if v_role in ('tenant', 'technician') and v_org_id is not null then
    update public.profiles set organization_id = v_org_id where id = new.id;
  end if;

  return new;

exception when others then
  raise exception 'handle_new_user error: % (sqlstate: %)', sqlerrm, sqlstate
    using errcode = 'P0001';
end;
$func$;
