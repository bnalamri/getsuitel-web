import { createClient, createAdminClient } from '@/lib/supabase/server'
import ArrearsClient from './ArrearsClient'

export const metadata = { title: 'Arrears & Overdue' }

export default async function ArrearsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user.id)
    .single()

  const orgId    = profile?.organization_id
  const userName = (profile?.full_name as string) ?? ''
  if (!orgId) return null

  const admin   = createAdminClient()
  const today   = new Date().toISOString().split('T')[0]

  const [invoicesRes, propertiesRes, orgRes] = await Promise.all([
    admin
      .from('invoices')
      .select(`
        id, amount, currency, status, due_date, created_at, type, notes,
        tenants(full_name, email, phone),
        units(unit_number, properties(id, name))
      `)
      .eq('organization_id', orgId)
      .or(`status.eq.overdue,and(status.eq.pending,due_date.lt.${today})`)
      .order('due_date', { ascending: true }),
    admin
      .from('properties')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name'),
    admin
      .from('organizations')
      .select('default_currency, name, date_format')
      .eq('id', orgId)
      .single(),
  ])

  return (
    <ArrearsClient
      invoices={invoicesRes.data ?? []}
      properties={propertiesRes.data ?? []}
      defaultCurrency={(orgRes.data?.default_currency as string) ?? 'OMR'}
      dateFormat={(orgRes.data?.date_format as string) ?? 'DD/MM/YYYY'}
      orgName={(orgRes.data?.name as string) ?? ''}
      userName={userName}
    />
  )
}
