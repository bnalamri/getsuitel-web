import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import IncomeReportClient from './IncomeReportClient'

export const metadata = { title: 'Monthly Income Report' }

export default async function IncomeReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return null

  const admin = createAdminClient()
  const [invoicesRes, propertiesRes, orgRes] = await Promise.all([
    admin.from('invoices')
      .select('id, amount, status, currency, due_date, created_at, unit_id, units(property_id, properties(id, name))')
      .eq('organization_id', orgId)
      .eq('type', 'rent'),
    admin.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
    admin.from('organizations').select('default_currency, name').eq('id', orgId).single(),
  ])

  return (
    <IncomeReportClient
      invoices={invoicesRes.data ?? []}
      properties={propertiesRes.data ?? []}
      defaultCurrency={(orgRes.data?.default_currency as string) ?? 'OMR'}
      orgName={(orgRes.data?.name as string) ?? ''}
    />
  )
}
