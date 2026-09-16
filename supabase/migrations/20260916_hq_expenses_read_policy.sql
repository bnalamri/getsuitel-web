-- ============================================================
-- GetSuitel — HQ read access on expenses (Cross-Branch P&L undercount fix)
-- Migration: 20260916_hq_expenses_read_policy.sql
--
-- expenses has four RLS policies (owner_expenses_select/insert/update/delete,
-- see Fixes/supabase_migration.sql), every one scoped strictly to
-- organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()).
-- There has never been an HQ bypass on this table, unlike branch_billing
-- ("branch_billing: hq all", USING (is_hq_admin())) and maintenance_requests
-- ("maintenance: hq all", USING (is_hq_admin())).
--
-- Effect: HQ's Cross-Branch P&L screen (web /hq/reports/pnl and mobile
-- hq_pnl_report.dart) reads expenses two different ways — web goes through
-- an admin (service-role) Supabase client that bypasses RLS entirely, so it
-- always sees every branch's expenses; mobile queries `expenses` directly
-- with the regular authenticated client, so RLS silently narrows the result
-- to whatever single org (if any) the HQ profile happens to carry —
-- undercounting Total Expenses and therefore overstating Net Income on
-- mobile only. Confirmed live: web showed 616.485 OMR expenses / 4,483.515
-- net; mobile showed 56.000 / 5,044.000 for the same branch and year.
--
-- Fix: add a read-only HQ bypass using is_hq_team() (hq_admin, hq_staff,
-- hq_finance — see 20260915k_fix_remaining_profile_reading_functions.sql),
-- matching the read-visibility the same three roles already have on
-- branch_billing and maintenance_requests. Read-only on purpose: HQ views
-- expense figures for reporting, but should never create/edit/delete an
-- owner's expense record — insert/update/delete stay owner-only.
-- ============================================================

CREATE POLICY "expenses: hq read"
  ON public.expenses FOR SELECT
  USING (public.is_hq_team());

NOTIFY pgrst, 'reload schema';
