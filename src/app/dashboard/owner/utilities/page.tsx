import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UtilitiesClient from './UtilitiesClient'

export default async function UtilitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) redirect('/login')
  if (!['owner', 'property_manager', 'manager', 'financial_manager'].includes(profile.role)) redirect('/dashboard')

  const admin = createAdminClient()

  const [billsRes, unitsRes, propertiesRes] = await Promise.all([
    admin
      .from('utility_bills')
      .select(`*, units(unit_number, properties(id, name)), tenants(full_name), properties(name)`)
      .eq('organization_id', profile.organization_id)
      .order('bill_date', { ascending: false })
      .limit(200),
    admin
      .from('units')
      .select(`id, unit_number, organization_id, properties(id, name), contracts(id, tenant_id, status, utilities_config, tenants(id, full_name))`)
      .eq('organization_id', profile.organization_id)
      .order('unit_number'),
    admin
      .from('properties')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .order('name'),
  ])

  const { data: org } = await admin
    .from('organizations')
    .select('default_currency')
    .eq('id', profile.organization_id)
    .single()

  return (
    <UtilitiesClient
      bills={billsRes.data ?? []}
      units={unitsRes.data ?? []}
      properties={propertiesRes.data ?? []}
      orgId={profile.organization_id}
      defaultCurrency={org?.default_currency ?? 'OMR'}
    />
  )
}
