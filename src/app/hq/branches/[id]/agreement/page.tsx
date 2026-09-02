import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgreementClient from './AgreementClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

export default async function AgreementPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['hq_admin', 'hq_finance', 'hq_staff'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Load branch details
  const { data: branch } = await supabase
    .from('branches')
    .select('id, name, display_name, city, region, max_units, max_staff, max_tenants, max_orgs')
    .eq('id', params.id)
    .single()

  if (!branch) redirect('/hq/branches')

  // Load existing agreement (may be null)
  const { data: agreement } = await supabase
    .from('branch_agreements')
    .select('*')
    .eq('branch_id', params.id)
    .maybeSingle()

  return (
    <AgreementClient
      branchId={params.id}
      branchName={branch.display_name ?? branch.name}
      branchCity={branch.city}
      branchCountry={branch.region}
      limits={{
        max_units: branch.max_units,
        max_staff: branch.max_staff,
        max_tenants: branch.max_tenants,
        max_orgs: branch.max_orgs,
      }}
      initialData={agreement}
    />
  )
}
