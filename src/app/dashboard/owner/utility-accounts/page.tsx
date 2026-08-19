import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Database } from 'lucide-react'
import UtilityAccountsClient from './UtilityAccountsClient'

export const metadata = { title: 'Utility Accounts' }

export default async function UtilityAccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, full_name')
    .eq('id', user.id)
    .single()
  const orgId    = profile?.organization_id
  const userName = (profile?.full_name as string) ?? ''
  if (!orgId) return null

  const admin = createAdminClient()
  const [accountsRes, propertiesRes, unitsRes, orgRes] = await Promise.all([
    admin
      .from('utility_accounts')
      .select(`id, utility_type, consumer_no, meter_number, recharge_code,
               tariff_type, service_type, notes, unit_id, property_id,
               units(unit_number), properties(name)`)
      .eq('organization_id', orgId)
      .order('property_id')
      .order('utility_type'),
    admin.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
    admin.from('units').select('id, unit_number, property_id, properties(id, name)').eq('organization_id', orgId).order('unit_number'),
    admin.from('organizations').select('name').eq('id', orgId).single(),
  ])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-xl">
          <Database size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Utility Accounts</h1>
          <p className="text-sm text-slate-500">Manage Consumer No., Meter No., and account details per unit or property</p>
        </div>
      </div>
      <UtilityAccountsClient
        accounts={accountsRes.data ?? []}
        properties={propertiesRes.data ?? []}
        units={unitsRes.data ?? []}
        orgName={(orgRes.data?.name as string) ?? ''}
        userName={userName}
      />
    </div>
  )
}
