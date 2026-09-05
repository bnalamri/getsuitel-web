-- ============================================================
-- GetSuitel — HQ Lifecycle Rebuild
-- Run in Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
-- Safe for production: does not touch any existing branch, agreement,
-- organization, or billing row. Only changes: (a) the branches.status
-- constraint + default, going forward; (b) FK delete behavior on
-- branch_agreements/hq_audit_logs; (c) adds read/write RLS policies for
-- hq_staff / hq_finance that were missing (they previously got silent
-- empty results or a false "saved" confirmation on writes).
--
-- Companion to "Review and Proper Way of HQ Accounts.docx" (2026-09-04).
-- ============================================================

-- ─── 1. Branch status — add the missing 'pending_agreement' value ─────────
-- A brand-new branch now starts LOCKED (pending_agreement) until its
-- franchise agreement is signed, at which point the app auto-transitions
-- it to 'active' (see hq_agreement_detail.dart / AgreementClient.tsx).
-- Existing branches keep whatever status they already have today — this
-- only changes the constraint and default for what happens from now on.
ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS branches_status_check;
ALTER TABLE public.branches
  ADD CONSTRAINT branches_status_check
  CHECK (status IN ('pending_agreement', 'active', 'suspended', 'archived'));
ALTER TABLE public.branches ALTER COLUMN status SET DEFAULT 'pending_agreement';


-- ─── 1b. Where the eventual superadmin invite should go ────────────────────
-- Branch creation no longer collects an email at creation time (invites now
-- fire on activation, not creation — see step 5 of the rebuild plan). HQ
-- sets this any time before signing, either on the branch's Edit form or
-- directly on the Agreement screen. If left blank, the branch still
-- activates on signature — HQ just has to copy/share the invite code
-- manually afterward instead of it being auto-emailed.
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS pending_superadmin_email TEXT;


-- ─── 2. Role helper functions for hq_staff / hq_finance ────────────────────
-- is_hq_admin() already exists (20260831_hq_layer0.sql) and stays as the
-- gate for destructive/admin-only writes (suspend, archive, delete, invite
-- new HQ team members). These two new helpers cover read access and the
-- narrower set of writes hq_staff/hq_finance are actually meant to do.
CREATE OR REPLACE FUNCTION public.is_hq_team()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role IN ('hq_admin', 'hq_staff', 'hq_finance') FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_hq_finance_or_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role IN ('hq_admin', 'hq_finance') FROM public.profiles WHERE id = auth.uid();
$$;


-- ─── 3. branches — hq_staff/hq_finance can read; hq_finance can update
--        (Save Limits was silently failing for hq_finance: RLS blocked the
--        UPDATE, the audit-log insert then failed, and the route swallowed
--        both and returned {ok:true} anyway) ──────────────────────────────
DROP POLICY IF EXISTS "branches: hq team read" ON public.branches;
CREATE POLICY "branches: hq team read"
  ON public.branches FOR SELECT
  USING (public.is_hq_team());

DROP POLICY IF EXISTS "branches: hq finance update" ON public.branches;
CREATE POLICY "branches: hq finance update"
  ON public.branches FOR UPDATE
  USING (public.is_hq_finance_or_admin())
  WITH CHECK (public.is_hq_finance_or_admin());
-- Note: this grants row-level UPDATE on the whole branches row to
-- hq_finance, matching the existing pattern where
-- /api/hq/branches/[id]/limits already restricts which fields it accepts
-- at the app layer. If tighter column-level scoping is wanted later, move
-- Save Limits to a SECURITY DEFINER RPC instead of a raw table UPDATE.


-- ─── 4. branch_billing — hq_finance can read (hq_staff still cannot —
--        financial figures stay hidden from hq_staff per item #412) ───────
DROP POLICY IF EXISTS "branch_billing: hq finance read" ON public.branch_billing;
CREATE POLICY "branch_billing: hq finance read"
  ON public.branch_billing FOR SELECT
  USING (public.is_hq_finance_or_admin());


-- ─── 5. hq_audit_logs — any HQ role can read the trail and log their own
--        actions (previously only hq_admin could INSERT, so hq_finance's
--        own Save Limits audit entry silently failed) ─────────────────────
DROP POLICY IF EXISTS "hq_audit_logs: hq team read" ON public.hq_audit_logs;
CREATE POLICY "hq_audit_logs: hq team read"
  ON public.hq_audit_logs FOR SELECT
  USING (public.is_hq_team());

DROP POLICY IF EXISTS "hq_audit_logs: hq team insert" ON public.hq_audit_logs;
CREATE POLICY "hq_audit_logs: hq team insert"
  ON public.hq_audit_logs FOR INSERT
  WITH CHECK (public.is_hq_team());


-- ─── 6. hq_notices — hq_staff/hq_finance can see HQ broadcasts
--        (creating/deleting notices stays hq_admin-only) ──────────────────
DROP POLICY IF EXISTS "hq_notices: hq team read" ON public.hq_notices;
CREATE POLICY "hq_notices: hq team read"
  ON public.hq_notices FOR SELECT
  USING (public.is_hq_team());


-- ─── 7. hq_invitations — hq_staff/hq_finance can view the HQ team roster
--        (inviting/revoking stays hq_admin-only, enforced server-side with
--        the service-role key, so no INSERT/DELETE policy is added here) ──
DROP POLICY IF EXISTS "hq_invitations: hq team read" ON public.hq_invitations;
CREATE POLICY "hq_invitations: hq team read"
  ON public.hq_invitations FOR SELECT
  USING (public.is_hq_team());


-- ─── 8. platform_feature_flags — hq_staff/hq_finance can view flags
--        (toggling flags stays hq_admin-only) ──────────────────────────────
DROP POLICY IF EXISTS "platform_feature_flags: hq team read" ON public.platform_feature_flags;
CREATE POLICY "platform_feature_flags: hq team read"
  ON public.platform_feature_flags FOR SELECT
  USING (public.is_hq_team());


-- ─── 9. Branch deletion — stop cascading away a branch's paper trail ───────
-- Today, deleting a branch (the DELETE /api/hq/branches route, currently
-- unreachable from any UI) would CASCADE-delete its signed legal agreement
-- and its entire audit history along with it. Switch both to RESTRICT so a
-- branch with agreement/audit history can't be deleted until it's
-- deliberately cleaned up first — matching the org-count guard already
-- enforced on Archive.
ALTER TABLE public.branch_agreements DROP CONSTRAINT IF EXISTS branch_agreements_branch_id_fkey;
ALTER TABLE public.branch_agreements
  ADD CONSTRAINT branch_agreements_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;

ALTER TABLE public.hq_audit_logs DROP CONSTRAINT IF EXISTS hq_audit_logs_branch_id_fkey;
ALTER TABLE public.hq_audit_logs
  ADD CONSTRAINT hq_audit_logs_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;

-- branch_billing intentionally stays ON DELETE CASCADE — billing rows have
-- no independent legal/audit significance once a branch is truly gone.


-- ============================================================
-- Done. Nothing above modifies existing branches, agreements,
-- organizations, or billing rows — only the rules going forward.
-- ============================================================
