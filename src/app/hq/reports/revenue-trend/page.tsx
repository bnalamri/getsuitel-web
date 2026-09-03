import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import RevenueTrendClient from './RevenueTrendClient'

export default async function HQRevenueTrendPage({
  searchParams,
}: {
  searchParams: { branch?: string }
}) {
  const supabase = createAdminClient()
  const selectedBranch = searchParams.branch ?? null

  // Last 12 months
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const fromDate = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth(), 1)
    .toISOString().substring(0, 10)

  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    months.push(d.toISOString().substring(0, 10))
  }

  let query = supabase
    .from('branch_billing')
    .select('branch_id, month, total_revenue_omr, share_amount_omr, license_fee_omr, status, branches ( display_name )')
    .gte('month', fromDate)
    .order('month', { ascending: false })

  if (selectedBranch) query = query.eq('branch_id', selectedBranch)

  const [{ data: rawBilling }, { data: branches }] = await Promise.all([
    query,
    supabase.from('branches').select('id, display_name').order('display_name'),
  ])



  function cleanName(raw: string | undefined | null): string {
    if (!raw) return '—'
    return raw
      .replace(/^GetSuitel\s*[—–-]\s*/i, '')  // strip "GetSuitel — " prefix
      .replace(/ Branch$/, '')                 // strip hardcoded " Branch" suffix
      .trim()
  }

  // Normalize into a flat shape for the client
  const billing = (rawBilling ?? []).map(r => ({
    branch_id:   r.branch_id,
    branch_name: cleanName((r.branches as { display_name: string } | null)?.display_name),
    month:       r.month.substring(0, 10),
    revenue:     Number(r.total_revenue_omr),
    share:       Number(r.share_amount_omr),
    license:     Number(r.license_fee_omr),
    status:      r.status as string,
  }))

  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading…</div>}>
      <RevenueTrendClient
        billing={billing}
        branches={(branches ?? []).map(b => ({ ...b, display_name: cleanName(b.display_name) }))}
        months={months}
        selectedBranch={selectedBranch}
      />
    </Suspense>
  )
}
