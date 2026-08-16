import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getOrgAndRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()
  if (!profile || !['owner', 'property_manager', 'manager', 'financial_manager'].includes(profile.role)) return null
  return profile as { role: string; organization_id: string }
}

// GET /api/utilities  — list utility bills for org
export async function GET(req: Request) {
  const profile = await getOrgAndRole()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const unitId      = searchParams.get('unit_id')
  const utilityType = searchParams.get('utility_type')
  const status      = searchParams.get('status')

  const admin = createAdminClient()
  let q = admin
    .from('utility_bills')
    .select(`
      *,
      units(unit_number, properties(name)),
      tenants(full_name)
    `)
    .eq('organization_id', profile.organization_id)
    .order('bill_date', { ascending: false })

  if (unitId)      q = q.eq('unit_id', unitId)
  if (utilityType) q = q.eq('utility_type', utilityType)
  if (status)      q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/utilities  — create utility bill + auto-create invoice or expense
export async function POST(req: Request) {
  const profile = await getOrgAndRole()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    unit_id, contract_id, tenant_id, utility_type,
    bill_date, due_date, amount, currency,
    billed_to, meter_from, meter_to, notes,
  } = body

  if (!unit_id || !utility_type || !bill_date || !due_date || !amount || !billed_to) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Insert utility bill first
  const { data: bill, error: billErr } = await admin
    .from('utility_bills')
    .insert({
      organization_id: profile.organization_id,
      unit_id,
      contract_id:  contract_id  ?? null,
      tenant_id:    tenant_id    ?? null,
      utility_type,
      bill_date,
      due_date,
      amount:       Number(amount),
      currency:     currency ?? 'OMR',
      billed_to,
      meter_from:   meter_from ?? null,
      meter_to:     meter_to   ?? null,
      notes:        notes      ?? null,
      status:       'pending',
    })
    .select('id')
    .single()

  if (billErr) return NextResponse.json({ error: billErr.message }, { status: 500 })

  const utilityLabel = utility_type === 'water' ? 'Water' : utility_type === 'electricity' ? 'Electricity' : 'Internet'

  if (billed_to === 'tenant' && tenant_id) {
    // Create tenant invoice
    const { data: inv, error: invErr } = await admin
      .from('invoices')
      .insert({
        organization_id: profile.organization_id,
        tenant_id,
        unit_id,
        type:     'utility',
        amount:   Number(amount),
        currency: currency ?? 'OMR',
        due_date,
        status:   'sent',
        notes:    `${utilityLabel} bill for period ending ${bill_date}${notes ? ` — ${notes}` : ''}`,
      })
      .select('id')
      .single()

    if (!invErr && inv) {
      await admin
        .from('utility_bills')
        .update({ status: 'invoiced', invoice_id: inv.id })
        .eq('id', bill.id)
    }

    return NextResponse.json({ ok: true, id: bill.id, invoice_id: inv?.id ?? null, action: 'invoiced' })
  }

  // Owner bill — stays pending until owner marks it paid
  return NextResponse.json({ ok: true, id: bill.id, action: 'pending' })
}

// PATCH /api/utilities  — mark bill as paid (creates expense for owner bills)
export async function PATCH(req: Request) {
  const profile = await getOrgAndRole()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action } = await req.json()
  if (!id || action !== 'mark_paid') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const admin = createAdminClient()

  const { data: bill } = await admin
    .from('utility_bills')
    .select('id, organization_id, billed_to, utility_type, amount, currency, bill_date, unit_id, expense_id, notes')
    .eq('id', id)
    .single()

  if (!bill || bill.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
  }

  const utilityLabel = bill.utility_type === 'water' ? 'Water' : bill.utility_type === 'electricity' ? 'Electricity' : 'Internet'
  let expenseId = bill.expense_id ?? null

  if (bill.billed_to === 'owner' && !expenseId) {
    const today = new Date().toISOString().split('T')[0]
    const { data: exp } = await admin
      .from('expenses')
      .insert({
        organization_id: profile.organization_id,
        category:        'utilities',
        description:     `${utilityLabel} bill${bill.notes ? ` — ${bill.notes}` : ''}`,
        amount:          Number(bill.amount),
        currency:        bill.currency ?? 'OMR',
        date:            today,
      })
      .select('id')
      .single()
    expenseId = exp?.id ?? null
  }

  const { error: updateErr } = await admin
    .from('utility_bills')
    .update({ status: 'paid', expense_id: expenseId })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
