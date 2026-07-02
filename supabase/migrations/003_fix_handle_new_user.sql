-- ============================================================
-- GetSuitel — Fix handle_new_user trigger
-- Run in: Supabase Dashboard → SQL Editor
--
-- What this fixes:
-- 1. Owners: auto-creates an organization from org_name metadata
--    and sets profile.organization_id
-- 2. Tenants/Technicians: sets profile.organization_id from
--    organization_id metadata (passed via invite code flow)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role      user_role;
  v_org_id    uuid;
  v_org_name  text;
  v_plan      subscription_plan;
begin
  -- Extract metadata
  v_role     := coalesce((new.raw_user_meta_data->>'role')::user_role, 'owner');
  v_org_name := new.raw_user_meta_data->>'org_name';
  v_org_id   := (new.raw_user_meta_data->>'organization_id')::uuid;
  v_plan     := coalesce((new.raw_user_meta_data->>'plan')::subscription_plan, 'basic');

  -- Insert profile first (organization_id may be null initially)
  insert into public.profiles (id, email, full_name, role, phone, lang_pref)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_role,
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'lang_pref')::lang_pref, 'en')
  );

  -- For owners: create organization and link it
  if v_role = 'owner' and v_org_name is not null then
    insert into public.organizations (name, owner_id, subscription_plan, subscription_status, trial_ends_at,
      max_units, max_tenants)
    values (
      v_org_name,
      new.id,
      v_plan,
      'trialing',
      now() + interval '30 days',
      case v_plan when 'basic' then 10 when 'pro' then 50 else 9999 end,
      case v_plan when 'basic' then 15 when 'pro' then 100 else 9999 end
    )
    returning id into v_org_id;

    update public.profiles set organization_id = v_org_id where id = new.id;
  end if;

  -- For tenants/technicians: link to existing org from invite code
  if v_role in ('tenant', 'technician') and v_org_id is not null then
    update public.profiles set organization_id = v_org_id where id = new.id;
  end if;

  return new;
end;
$$;
