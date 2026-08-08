import { createClient, createAdminClient } from '@/lib/supabase/server'
import ClosingReportClient from './ClosingReportClient'

export const metadata = { title: 'Month-End Closing Report' }
export const dynamic = 'force-dynamic'

export default async function ClosingReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single()
  const orgId = profile?.organization_id
  if (!orgId) return null

  const admin = createAdminClient()

  const [invoicesRes, expensesRes, propertiesRes, orgRes] = await Promise.all([
    admin
      .from('invoices')
      .select('id, amount, status, currency, type, due_date, created_at, paid_date, paid_via, notes, tenant_id, unit_id, tenants(full_name, email), units(unit_number, properties(id, name))')
      .eq('organization_id', orgId)
      .order('due_date', { ascending: false }),
    admin
      .from('expenses')
      .select('id, description, amount, currency, category, date, properties(name)')
      .eq('organization_id', orgId)
      .order('date', { ascending: false }),
    admin
      .from('properties')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name'),
    admin
      .from('organizations')
      .select('default_currency, date_format, name')
      .eq('id', orgId)
      .single(),
  ])

  return (
    <ClosingReportClient
      invoices={invoicesRes.data ?? []}
      expenses={expensesRes.data ?? []}
      properties={propertiesRes.data ?? []}
      defaultCurrency={(orgRes.data?.default_currency as string) ?? 'OMR'}
      dateFormat={(orgRes.data?.date_format as string) ?? 'DD/MM/YYYY'}
      orgName={(orgRes.data?.name as string) ?? ''}
      printerName={(profile?.full_name as string) ?? user.email ?? ''}
    />
  )
}
