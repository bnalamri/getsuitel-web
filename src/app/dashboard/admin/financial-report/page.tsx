import { createAdminClient, createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import FinancialReportPDF from './FinancialReportPDF'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Financial Report' }

export default async function FinancialReportPage() {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: adminProfile } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    : { data: null }
  const printerName = (adminProfile?.full_name as string) || user?.email || 'Unknown'

  const admin = createAdminClient()

  const [orgsRes, invoicesRes, receiptsRes, proofsRes] = await Promise.all([
    admin.from('organizations').select('id, name, subscription_plan, subscription_status, subscription_expires_at, default_currency'),
    admin.from('invoices').select('organization_id, amount, currency, status, type, created_at, due_date'),
    admin.from('payment_receipts').select('organization_id, amount, method, status, confirmed_at'),
    admin.from('subscription_payment_proofs').select('plan, status, submitted_at, amount, currency').order('submitted_at', { ascending: false }),
  ])

  const printDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <FinancialReportPDF
      orgs={orgsRes.data ?? []}
      invoices={invoicesRes.data ?? []}
      receipts={receiptsRes.data ?? []}
      proofs={proofsRes.data ?? []}
      printDate={printDate}
      printerName={printerName}
    />
  )
}
