import { createClient } from './supabase/server'

/**
 * Returns the branch_id for the currently logged-in superadmin.
 * Returns null if the user is not a superadmin or has no branch yet.
 * Use this to scope all admin queries so each branch only sees its own orgs.
 */
export async function getMyBranchId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('branches')
    .select('id')
    .eq('superadmin_id', user.id)
    .single()
  return data?.id ?? null
}
