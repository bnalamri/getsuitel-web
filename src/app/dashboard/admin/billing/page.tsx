import { createClient, createAdminClient } from '@/lib/supabase/server'
import BillingClient from './BillingClient'

export default async function BranchBillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  const { data: branch } = await supabase
    .from('branches')
    .select('id, display_name, license_fee_omr, revenue_share_pct, currency')
    .eq('superadmin_id', user!.id)
    .single()

  const [{ data: billing }, { data: config }] = await Promise.all([
    branch
      ? admin
          .from('branch_billing')
          .select('id, month, total_revenue_omr, share_amount_omr, license_fee_omr, currency, status, payment_method, receipt_url, submitted_at, paid_at, rejection_reason, notes')
          .eq('branch_id', branch.id)
          .order('month', { ascending: false })
      : Promise.resolve({ data: [] }),
    admin
      .from('platform_config')
      .select('hq_bank_name, hq_bank_account_name, hq_bank_iban, hq_mobile_transfer_number, hq_mobile_transfer_label')
      .eq('id', 1)
      .single(),
  ])

  return <BillingClient branch={branch} billing={billing ?? []} hqPayment={config ?? null} />
}
