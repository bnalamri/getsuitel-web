import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import PnLClient from './PnLClient'

export const metadata = { title: 'P&L Report' }

export default async function PnLPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id, full_name').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return null
  const userName = (profile?.full_name as string) || user.email || ''

  const admin = createAdminClient()
  const [invoicesRes, expensesRes, maintenanceRes, propertiesRes, orgRes] = await Promise.all([
    admin.from('invoices')
      .select('id, amount, status, currency, due_date, created_at, unit_id, units(property_id, properties(id, name))')
      .eq('organization_id', orgId),
    admin.from('expenses')
      .select('id, date, category, description, amount, currency, property_id, properties(name)')
      .eq('organization_id', orgId),
    admin.from('maintenance_requests')
      .select('id, charge_amount, charge_payer, completed_at, unit_id, units(property_id, properties(id, name))')
      .eq('organization_id', orgId)
      .not('charge_amount', 'is', null),
    admin.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
    admin.from('organizations').select('default_currency, name').eq('id', orgId).single(),
  ])

  return (
    <PnLClient
      invoices={invoicesRes.data ?? []}
      expenses={expensesRes.data ?? []}
      maintenance={maintenanceRes.data ?? []}
      properties={propertiesRes.data ?? []}
      defaultCurrency={(orgRes.data?.default_currency as string) ?? 'OMR'}
      orgName={(orgRes.data?.name as string) ?? ''}
      userName={userName}
    />
  )
}
