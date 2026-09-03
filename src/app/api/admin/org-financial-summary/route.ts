import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/api-auth'

export async function GET(req: Request) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })

  const admin = createAdminClient()

  const [
    { data: proofs },
    { data: invoices },
  ] = await Promise.all([
    // Subscription payment proofs
    admin
      .from('subscription_payment_proofs')
      .select('amount, currency, status, submitted_at')
      .eq('organization_id', orgId),

    // Rental invoices
    admin
      .from('invoices')
      .select('amount, currency, status')
      .eq('organization_id', orgId),
  ])

  // Subscription collected (approved proofs)
  const subscriptionCollected = (proofs ?? [])
    .filter(p => p.status === 'approved')
    .reduce((s, p) => s + Number(p.amount ?? 0), 0)

  const subscriptionCurrency = (proofs ?? []).find(p => p.status === 'approved')?.currency ?? 'USD'

  // Pending proofs
  const pendingProofs = (proofs ?? []).filter(p => p.status === 'pending').length

  // Rental revenue collected (paid invoices)
  const rentalCollected = (invoices ?? [])
    .filter(i => i.status === 'paid')
    .reduce((s, i) => s + Number(i.amount ?? 0), 0)

  // Unpaid invoices
  const unpaidInvoices = (invoices ?? []).filter(i => i.status !== 'paid' && i.status !== 'canceled')
  const unpaidCount  = unpaidInvoices.length
  const unpaidAmount = unpaidInvoices.reduce((s, i) => s + Number(i.amount ?? 0), 0)

  return NextResponse.json({
    subscriptionCollected,
    subscriptionCurrency,
    pendingProofs,
    rentalCollected,
    unpaidCount,
    unpaidAmount,
  })
}
