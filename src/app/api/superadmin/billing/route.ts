import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadminEither } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

// GET /api/superadmin/billing — this branch's billing history + HQ payment
// details. Mobile has no direct Supabase read access to branch_billing
// (RLS there is HQ-only), so it goes through this route instead of a
// direct .from('branch_billing').select() like the web server component does.
export async function GET(req: Request) {
  const auth = await requireSuperadminEither(req)
  if (!auth.ok) return auth.response

  const admin = createAdminClient()

  const { data: branch } = await admin
    .from('branches')
    .select('id, display_name, license_fee_omr, revenue_share_pct')
    .eq('superadmin_id', auth.userId)
    .single()

  if (!branch) return NextResponse.json({ branch: null, billing: [], hqPayment: null })

  const [{ data: billing }, { data: config }] = await Promise.all([
    admin
      .from('branch_billing')
      .select('id, month, total_revenue_omr, share_amount_omr, license_fee_omr, status, payment_method, receipt_url, submitted_at, paid_at, rejection_reason, notes')
      .eq('branch_id', branch.id)
      .order('month', { ascending: false }),
    admin
      .from('platform_config')
      .select('hq_bank_name, hq_bank_account_name, hq_bank_iban, hq_mobile_transfer_number, hq_mobile_transfer_label')
      .eq('id', 1)
      .single(),
  ])

  return NextResponse.json({ branch, billing: billing ?? [], hqPayment: config ?? null })
}
