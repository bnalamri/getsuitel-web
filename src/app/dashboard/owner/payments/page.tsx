import { createClient } from '@/lib/supabase/server'
import PaymentsClient from './PaymentsClient'

export const metadata = { title: 'Payments' }

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found</div>

  const [receiptsRes, invoicesRes, recentPaidRes, propertiesRes] = await Promise.all([
    supabase.from('payment_receipts')
      .select('*, invoices(amount, currency, due_date, type), tenants(full_name)')
      .eq('organization_id', orgId)
      .order('submitted_at', { ascending: false }),
    supabase.from('invoices')
      .select('*, tenants(full_name), units(property_id, unit_number, properties(name))')
      .eq('organization_id', orgId)
      .in('status', ['sent', 'overdue'])
      .order('due_date', { ascending: true }),
    supabase.from('invoices')
      .select('id, amount, currency, paid_date, payment_method, tenants(full_name), units(property_id)')
      .eq('organization_id', orgId)
      .in('status', ['paid', 'cleared'])
      .eq('type', 'rent')
      .order('paid_date', { ascending: false })
      .limit(10),
    supabase.from('properties')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name'),
  ])

  const receipts  = receiptsRes.data  ?? []
  const pending   = receipts.filter(r => r.status === 'pending')
  const confirmed = receipts.filter(r => r.status === 'confirmed')

  return (
    <PaymentsClient
      pending={pending as Record<string, unknown>[]}
      confirmed={confirmed as Record<string, unknown>[]}
      invoices={(invoicesRes.data ?? []) as Record<string, unknown>[]}
      recentPaid={(recentPaidRes.data ?? []) as Record<string, unknown>[]}
      properties={propertiesRes.data ?? []}
    />
  )
}
