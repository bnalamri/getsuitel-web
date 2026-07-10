import { createAdminClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import FinancialReportPDF from './FinancialReportPDF'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Financial Report' }

export default async function FinancialReportPage() {
  noStore()
  const admin = createAdminClient()

  const [orgsRes, invoicesRes, receiptsRes] = await Promise.all([
    admin.from('organizations').select('id, name, subscription_plan, subscription_status'),
    admin.from('invoices').select('organization_id, amount, currency, status, type, created_at, due_date'),
    admin.from('payment_receipts').select('organization_id, amount, method, status, confirmed_at'),
  ])

  const printDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <FinancialReportPDF
      orgs={orgsRes.data ?? []}
      invoices={invoicesRes.data ?? []}
      receipts={receiptsRes.data ?? []}
      printDate={printDate}
    />
  )
}
