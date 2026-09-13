import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'hq_admin') return null
  return user
}

// PATCH /api/hq/billing — confirm, reject, or directly mark a record paid
// body: { id: string, notes?: string, action?: 'confirm' | 'reject' | 'mark_paid', rejection_reason?: string }
//
// - 'confirm'   — branch submitted a receipt (status was 'submitted'); HQ confirms it, recording who/when.
// - 'reject'    — branch submitted a receipt HQ doesn't accept; branch can resubmit.
// - 'mark_paid' (default, backward-compatible) — HQ marks paid directly with no receipt on file
//   (e.g. cash handed over off-platform). No confirmed_by/confirmed_at trail in this case.
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const user = await requireHQ(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, notes, action = 'mark_paid', rejection_reason } = await req.json()
  if (!id) return NextResponse.json({ error: 'Billing record ID required' }, { status: 400 })

  const now = new Date().toISOString()
  const updates: Record<string, unknown> =
    action === 'reject'
      ? { status: 'rejected', rejection_reason: rejection_reason ?? null, confirmed_by: user.id, confirmed_at: now }
      : action === 'confirm'
      ? { status: 'paid', paid_at: now, confirmed_by: user.id, confirmed_at: now, notes: notes ?? null }
      : { status: 'paid', paid_at: now, notes: notes ?? null }

  const { data, error } = await supabase
    .from('branch_billing')
    .update(updates)
    .eq('id', id)
    .select('id, status, paid_at, confirmed_by, confirmed_at, rejection_reason')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/hq/billing — manually generate billing records for a given month
// body: { month: 'YYYY-MM-DD' }  (must be the 1st of the month)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  if (!await requireHQ(supabase)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const monthStr: string = body.month // e.g. '2026-08-01'
  if (!monthStr) return NextResponse.json({ error: 'month required (YYYY-MM-DD)' }, { status: 400 })

  const monthStart = new Date(monthStr)
  const monthEnd   = new Date(monthStart)
  monthEnd.setMonth(monthEnd.getMonth() + 1)

  return generateBilling(supabase, monthStart.toISOString().substring(0, 10), monthStart, monthEnd)
}

export async function generateBilling(
  supabase: Awaited<ReturnType<typeof createClient>>,
  monthKey: string,       // 'YYYY-MM-DD' (1st of month)
  monthStart: Date,
  monthEnd: Date,
) {
  // Get all active/suspended branches with their revenue share %
  const { data: branches } = await supabase
    .from('branches')
    .select('id, license_fee_omr, revenue_share_pct')
    .in('status', ['active', 'suspended'])

  if (!branches?.length) {
    return NextResponse.json({ generated: 0, message: 'No active branches' })
  }

  const results: string[] = []

  for (const branch of branches) {
    // Get all orgs in this branch
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .eq('branch_id', branch.id)

    const orgIds = orgs?.map(o => o.id) ?? []
    if (orgIds.length === 0) {
      // No orgs — insert zero-revenue billing row
      const { error } = await supabase.from('branch_billing').upsert({
        branch_id:          branch.id,
        month:              monthKey,
        total_revenue_omr:  0,
        share_amount_omr:   0,
        license_fee_omr:    Number(branch.license_fee_omr),
        status:             'pending',
      }, { onConflict: 'branch_id,month', ignoreDuplicates: false })
      if (!error) results.push(branch.id)
      continue
    }

    // Sum paid OMR invoices within the month
    const { data: invoices } = await supabase
      .from('invoices')
      .select('amount, currency')
      .in('organization_id', orgIds)
      .eq('status', 'paid')
      .gte('paid_date', monthStart.toISOString().substring(0, 10))
      .lt('paid_date', monthEnd.toISOString().substring(0, 10))

    const totalRevenue = invoices?.reduce((s, inv) => {
      // Include only OMR invoices; skip foreign-currency for now
      if (!inv.currency || inv.currency === 'OMR') return s + Number(inv.amount)
      return s
    }, 0) ?? 0

    const shareAmount = totalRevenue * Number(branch.revenue_share_pct) / 100

    const { error } = await supabase.from('branch_billing').upsert({
      branch_id:          branch.id,
      month:              monthKey,
      total_revenue_omr:  totalRevenue,
      share_amount_omr:   shareAmount,
      license_fee_omr:    Number(branch.license_fee_omr),
      status:             'pending',
    }, { onConflict: 'branch_id,month', ignoreDuplicates: false })

    if (!error) results.push(branch.id)
  }

  return NextResponse.json({ generated: results.length, branches: results })
}
