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
    { data: org },
    { data: invoices },
    { data: expenses },
    { data: proofs },
    { data: maintenance },
    { data: properties },
    { data: units },
    { data: tenants },
  ] = await Promise.all([
    admin.from('organizations')
      .select('*, profiles!organizations_owner_id_fkey(full_name, email, phone)')
      .eq('id', orgId).single(),
    admin.from('invoices')
      .select('id, amount, currency, status, type, due_date, paid_date, created_at')
      .eq('organization_id', orgId).order('due_date', { ascending: false }),
    admin.from('expenses')
      .select('id, amount, currency, category, description, date')
      .eq('organization_id', orgId).order('date', { ascending: false }),
    admin.from('subscription_payment_proofs')
      .select('id, amount, currency, status, submitted_at, reviewed_at, notes')
      .eq('organization_id', orgId).order('submitted_at', { ascending: false }),
    admin.from('maintenance_requests')
      .select('id, title, status, charge_amount, charge_payer, completed_at, created_at')
      .eq('organization_id', orgId).order('created_at', { ascending: false }),
    admin.from('properties').select('id, name, address').eq('organization_id', orgId),
    admin.from('units').select('id, unit_number, status, rent_amount').eq('organization_id', orgId),
    admin.from('tenants').select('id, full_name, email, phone').eq('organization_id', orgId),
  ])

  return NextResponse.json({
    org,
    invoices:    invoices    ?? [],
    expenses:    expenses    ?? [],
    proofs:      proofs      ?? [],
    maintenance: maintenance ?? [],
    properties:  properties  ?? [],
    units:       units       ?? [],
    tenants:     tenants     ?? [],
    exportedAt:  new Date().toISOString(),
  })
}
