import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UnassignedOrgsClient from './UnassignedOrgsClient'

export default async function UnassignedOrgsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'hq_admin') redirect('/hq')

  const [{ data: orgs }, { data: branches }] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, subscription_status, subscription_plan, country, created_at')
      .is('branch_id', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('branches')
      .select('id, display_name, city, region, status')
      .neq('status', 'archived')
      .order('display_name'),
  ])

  return <UnassignedOrgsClient orgs={orgs ?? []} branches={branches ?? []} />
}
