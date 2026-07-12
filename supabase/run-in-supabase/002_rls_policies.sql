-- ============================================================
-- GetSuitel — Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles             enable row level security;
alter table public.organizations        enable row level security;
alter table public.properties           enable row level security;
alter table public.units                enable row level security;
alter table public.tenants              enable row level security;
alter table public.contracts            enable row level security;
alter table public.invoices             enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.notifications        enable row level security;
alter table public.documents            enable row level security;

-- ─── HELPER FUNCTIONS ───────────────────────────────────────────────────────

create or replace function public.get_my_role()
returns user_role language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.get_my_org()
returns uuid language sql stable security definer as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

-- ─── PROFILES ───────────────────────────────────────────────────────────────

-- Everyone can read their own profile
create policy "profiles: own read"        on public.profiles for select using (id = auth.uid());
-- Superadmin can read all
create policy "profiles: superadmin read" on public.profiles for select using (public.get_my_role() = 'superadmin');
-- Owner can read profiles in their org
create policy "profiles: owner read org"  on public.profiles for select using (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);
-- Own profile update
create policy "profiles: own update"      on public.profiles for update using (id = auth.uid());

-- ─── ORGANIZATIONS ──────────────────────────────────────────────────────────

-- Owner sees their own org
create policy "orgs: owner read"      on public.organizations for select using (owner_id = auth.uid());
-- Members see their org
create policy "orgs: member read"     on public.organizations for select using (id = public.get_my_org());
-- Superadmin sees all
create policy "orgs: superadmin all"  on public.organizations for all using (public.get_my_role() = 'superadmin');
-- Owner can create
create policy "orgs: owner create"    on public.organizations for insert with check (owner_id = auth.uid());
-- Owner can update own
create policy "orgs: owner update"    on public.organizations for update using (owner_id = auth.uid());

-- ─── PROPERTIES ─────────────────────────────────────────────────────────────

create policy "properties: org read"       on public.properties for select using (organization_id = public.get_my_org());
create policy "properties: superadmin all" on public.properties for all    using (public.get_my_role() = 'superadmin');
create policy "properties: owner write"    on public.properties for insert with check (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);
create policy "properties: owner update"   on public.properties for update using (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);
create policy "properties: owner delete"   on public.properties for delete using (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);

-- ─── UNITS ──────────────────────────────────────────────────────────────────

create policy "units: org read"       on public.units for select using (organization_id = public.get_my_org());
create policy "units: superadmin all" on public.units for all    using (public.get_my_role() = 'superadmin');
create policy "units: owner write"    on public.units for insert with check (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);
create policy "units: owner update"   on public.units for update using (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);
create policy "units: owner delete"   on public.units for delete using (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);
-- Tenant can only see their own unit
create policy "units: tenant read own" on public.units for select using (
  public.get_my_role() = 'tenant' and
  id in (
    select c.unit_id from public.contracts c
    join public.tenants t on t.id = c.tenant_id
    where t.profile_id = auth.uid() and c.status = 'active'
  )
);

-- ─── TENANTS ────────────────────────────────────────────────────────────────

create policy "tenants: org read"       on public.tenants for select using (organization_id = public.get_my_org());
create policy "tenants: superadmin all" on public.tenants for all    using (public.get_my_role() = 'superadmin');
create policy "tenants: owner write"    on public.tenants for insert with check (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);
create policy "tenants: owner update"   on public.tenants for update using (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);
-- Tenant reads own record
create policy "tenants: own read"       on public.tenants for select using (profile_id = auth.uid());

-- ─── CONTRACTS ──────────────────────────────────────────────────────────────

create policy "contracts: org read"       on public.contracts for select using (organization_id = public.get_my_org());
create policy "contracts: superadmin all" on public.contracts for all    using (public.get_my_role() = 'superadmin');
create policy "contracts: owner write"    on public.contracts for insert with check (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);
create policy "contracts: owner update"   on public.contracts for update using (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);
-- Tenant reads own contracts
create policy "contracts: tenant own"     on public.contracts for select using (
  tenant_id in (select id from public.tenants where profile_id = auth.uid())
);

-- ─── INVOICES ───────────────────────────────────────────────────────────────

create policy "invoices: org read"       on public.invoices for select using (organization_id = public.get_my_org());
create policy "invoices: superadmin all" on public.invoices for all    using (public.get_my_role() = 'superadmin');
create policy "invoices: owner write"    on public.invoices for insert with check (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);
create policy "invoices: owner update"   on public.invoices for update using (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);
-- Tenant reads own invoices
create policy "invoices: tenant own"     on public.invoices for select using (
  tenant_id in (select id from public.tenants where profile_id = auth.uid())
);

-- ─── MAINTENANCE ────────────────────────────────────────────────────────────

create policy "maint: org read"       on public.maintenance_requests for select using (organization_id = public.get_my_org());
create policy "maint: superadmin all" on public.maintenance_requests for all    using (public.get_my_role() = 'superadmin');
create policy "maint: owner write"    on public.maintenance_requests for insert with check (
  public.get_my_role() in ('owner', 'tenant') and organization_id = public.get_my_org()
);
create policy "maint: owner update"   on public.maintenance_requests for update using (
  public.get_my_role() = 'owner' and organization_id = public.get_my_org()
);
-- Tenant creates/reads own requests
create policy "maint: tenant own"     on public.maintenance_requests for select using (
  tenant_id in (select id from public.tenants where profile_id = auth.uid())
);
-- Technician reads assigned work
create policy "maint: tech assigned"  on public.maintenance_requests for select using (
  public.get_my_role() = 'technician' and technician_id = auth.uid()
);
create policy "maint: tech update"    on public.maintenance_requests for update using (
  public.get_my_role() = 'technician' and technician_id = auth.uid()
);

-- ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

create policy "notif: own all" on public.notifications for all using (user_id = auth.uid());

-- ─── DOCUMENTS ──────────────────────────────────────────────────────────────

create policy "docs: org read"       on public.documents for select using (organization_id = public.get_my_org());
create policy "docs: superadmin all" on public.documents for all    using (public.get_my_role() = 'superadmin');
create policy "docs: owner write"    on public.documents for insert with check (
  public.get_my_role() in ('owner', 'tenant') and organization_id = public.get_my_org()
);
