-- #303 Fix: superadmin access to staff_invitations + add status column
-- Run in: Supabase Dashboard → SQL Editor

-- 1. Add status column if it doesn't exist yet
ALTER TABLE public.staff_invitations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'used', 'revoked'));

-- 2. Back-fill: mark any already-accepted invitations as 'used'
UPDATE public.staff_invitations
SET status = 'used'
WHERE accepted_at IS NOT NULL AND status = 'pending';

-- 3. Superadmin can read all invitations (needed for mobile JWT client)
DROP POLICY IF EXISTS "superadmin read all invitations" ON public.staff_invitations;
CREATE POLICY "superadmin read all invitations"
ON public.staff_invitations
FOR SELECT
TO authenticated
USING (
  (SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
);

-- 4. Superadmin can revoke (update status) any invitation
DROP POLICY IF EXISTS "superadmin update invitations" ON public.staff_invitations;
CREATE POLICY "superadmin update invitations"
ON public.staff_invitations
FOR UPDATE
TO authenticated
USING (
  (SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
)
WITH CHECK (
  (SELECT role::text FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
);
