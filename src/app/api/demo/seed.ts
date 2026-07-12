/**
 * Shared demo data seeder.
 * Called by /api/demo/setup (once) and /api/demo/reset (daily cron).
 * Fully idempotent — safe to call multiple times.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export async function seedDemoData(orgId: string, admin: SupabaseClient) {
  const now = new Date()
  const toDate = (d: Date) => d.toISOString().split('T')[0]

  function monthsFromNow(n: number) {
    const d = new Date(now)
    d.setMonth(d.getMonth() + n)
    d.setDate(1)
    return d
  }

  // ── 1. Property ───────────────────────────────────────────────────────────
  let propertyId: string
  const { data: existingProp } = await admin
    .from('properties')
    .select('id')
    .eq('organization_id', orgId)
    .eq('name', 'Oakwood Residences')
    .maybeSingle()

  if (existingProp) {
    propertyId = existingProp.id
  } else {
    const { data: p, error } = await admin
      .from('properties')
      .insert({
        organization_id: orgId,
        name: 'Oakwood Residences',
        type: 'residential',
        address: 'Way 4521, Al Khuwair',
        city: 'Muscat',
        country: 'Oman',
      })
      .select('id')
      .single()
    if (error) throw new Error(`Property insert failed: ${error.message}`)
    propertyId = p!.id
  }

  // ── 2. Units ──────────────────────────────────────────────────────────────
  const unitDefs = [
    { unit_number: '101', unit_type: 'flat', floor: 1, area_sqm: 95,  bedrooms: 2, bathrooms: 1, rent_amount: 350, status: 'occupied' },
    { unit_number: '102', unit_type: 'flat', floor: 1, area_sqm: 80,  bedrooms: 1, bathrooms: 1, rent_amount: 250, status: 'occupied' },
    { unit_number: '201', unit_type: 'flat', floor: 2, area_sqm: 110, bedrooms: 3, bathrooms: 2, rent_amount: 420, status: 'vacant'   },
    { unit_number: '202', unit_type: 'flat', floor: 2, area_sqm: 95,  bedrooms: 2, bathrooms: 1, rent_amount: 350, status: 'vacant'   },
  ]

  const unitIds: Record<string, string> = {}
  for (const def of unitDefs) {
    const { data: existing } = await admin
      .from('units')
      .select('id')
      .eq('property_id', propertyId)
      .eq('unit_number', def.unit_number)
      .maybeSingle()

    if (existing) {
      unitIds[def.unit_number] = existing.id
    } else {
      const { data: u, error } = await admin
        .from('units')
        .insert({ ...def, property_id: propertyId, organization_id: orgId, currency: 'OMR' })
        .select('id')
        .single()
      if (error) throw new Error(`Unit ${def.unit_number} insert failed: ${error.message}`)
      unitIds[def.unit_number] = u!.id
    }
  }

  // ── 3. Tenants ────────────────────────────────────────────────────────────
  async function upsertTenant(full_name: string, email: string, phone: string, national_id: string) {
    const { data: existing } = await admin
      .from('tenants')
      .select('id')
      .eq('organization_id', orgId)
      .eq('full_name', full_name)
      .maybeSingle()
    if (existing) return existing.id
    const { data: t, error } = await admin
      .from('tenants')
      .insert({ full_name, email, organization_id: orgId, phone, national_id })
      .select('id')
      .single()
    if (error) throw new Error(`Tenant ${full_name} insert failed: ${error.message}`)
    return t!.id
  }

  const jamesId  = await upsertTenant('James Carter',   'james.carter@demo.getsuitel.com',   '+96891234567', 'A12345678')
  const sarahId  = await upsertTenant('Sarah Mitchell', 'sarah.mitchell@demo.getsuitel.com', '+96892345678', 'B87654321')

  // ── 4. Contracts ──────────────────────────────────────────────────────────
  async function upsertContract(
    unit_number: string,
    tenant_id: string,
    start: Date,
    end: Date,
    rent_amount: number,
    deposit_amount: number
  ) {
    const unit_id = unitIds[unit_number]
    const { data: existing } = await admin
      .from('contracts')
      .select('id')
      .eq('organization_id', orgId)
      .eq('unit_id', unit_id)
      .maybeSingle()
    if (existing) return existing.id
    const { data: c, error } = await admin
      .from('contracts')
      .insert({
        organization_id: orgId,
        unit_id,
        tenant_id,
        start_date: toDate(start),
        end_date: toDate(end),
        rent_amount,
        currency: 'OMR',
        deposit_amount,
        payment_day: 1,
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw new Error(`Contract insert failed: ${error.message}`)
    return c!.id
  }

  const contract1Id = await upsertContract('101', jamesId, monthsFromNow(-6), monthsFromNow(6),  350, 700)
  const contract2Id = await upsertContract('102', sarahId, monthsFromNow(-3), monthsFromNow(9),  250, 500)

  // ── 5. Invoices ───────────────────────────────────────────────────────────
  const { data: existingInv } = await admin
    .from('invoices')
    .select('id')
    .eq('organization_id', orgId)

  if (!existingInv?.length) {
    const invoices: object[] = []

    // James Carter — 3 paid + 1 pending
    for (let i = 3; i >= 1; i--) {
      const due = monthsFromNow(-i)
      invoices.push({
        organization_id: orgId,
        contract_id: contract1Id,
        tenant_id: jamesId,
        unit_id: unitIds['101'],
        type: 'rent',
        amount: 350,
        currency: 'OMR',
        due_date: toDate(due),
        paid_date: toDate(due),
        status: 'paid',
      })
    }
    invoices.push({
      organization_id: orgId,
      contract_id: contract1Id,
      tenant_id: jamesId,
      unit_id: unitIds['101'],
      type: 'rent',
      amount: 350,
      currency: 'OMR',
      due_date: toDate(monthsFromNow(0)),
      status: 'sent',
    })

    // Sarah Mitchell — 2 paid + 1 pending
    for (let i = 2; i >= 1; i--) {
      const due = monthsFromNow(-i)
      invoices.push({
        organization_id: orgId,
        contract_id: contract2Id,
        tenant_id: sarahId,
        unit_id: unitIds['102'],
        type: 'rent',
        amount: 250,
        currency: 'OMR',
        due_date: toDate(due),
        paid_date: toDate(due),
        status: 'paid',
      })
    }
    invoices.push({
      organization_id: orgId,
      contract_id: contract2Id,
      tenant_id: sarahId,
      unit_id: unitIds['102'],
      type: 'rent',
      amount: 250,
      currency: 'OMR',
      due_date: toDate(monthsFromNow(0)),
      status: 'sent',
    })

    const { error } = await admin.from('invoices').insert(invoices)
    if (error) throw new Error(`Invoices insert failed: ${error.message}`)
  }

  // ── 6. Maintenance requests ───────────────────────────────────────────────
  const { data: existingMaint } = await admin
    .from('maintenance_requests')
    .select('id')
    .eq('organization_id', orgId)

  if (!existingMaint?.length) {
    const { error } = await admin.from('maintenance_requests').insert([
      {
        organization_id: orgId,
        unit_id: unitIds['101'],
        tenant_id: jamesId,
        title: 'Air conditioning not cooling',
        description: 'The AC unit in the master bedroom stopped cooling. Temperature stays at 28°C even at full power.',
        category: 'hvac',
        priority: 'high',
        status: 'open',
      },
      {
        organization_id: orgId,
        unit_id: unitIds['102'],
        tenant_id: sarahId,
        title: 'Kitchen faucet leaking',
        description: 'Water drips from the kitchen faucet even when fully closed. Started about 3 days ago.',
        category: 'plumbing',
        priority: 'medium',
        status: 'in_progress',
      },
    ])
    if (error) throw new Error(`Maintenance insert failed: ${error.message}`)
  }

  return { propertyId, unitIds, jamesId, sarahId, contract1Id, contract2Id }
}
