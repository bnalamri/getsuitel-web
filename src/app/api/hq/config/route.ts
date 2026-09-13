import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireHQ(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'hq_admin') return null
  return user
}

export async function GET() {
  const supabase = await createClient()
  if (!await requireHQ(supabase)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('platform_config')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  if (!await requireHQ(supabase)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    date_format, default_currency, currency_symbol, hq_contact_email,
    hq_bank_name, hq_bank_account_name, hq_bank_iban,
    hq_mobile_transfer_number, hq_mobile_transfer_label,
    hq_bank_transfer_mode,
  } = body

  if (hq_bank_transfer_mode && !['manual', 'automatic'].includes(hq_bank_transfer_mode))
    return NextResponse.json({ error: 'Invalid hq_bank_transfer_mode' }, { status: 400 })

  const { data, error } = await supabase
    .from('platform_config')
    .update({
      ...(date_format        && { date_format }),
      ...(default_currency   && { default_currency }),
      ...(currency_symbol    && { currency_symbol }),
      ...(hq_contact_email   && { hq_contact_email }),
      ...(hq_bank_name              !== undefined && { hq_bank_name }),
      ...(hq_bank_account_name      !== undefined && { hq_bank_account_name }),
      ...(hq_bank_iban               !== undefined && { hq_bank_iban }),
      ...(hq_mobile_transfer_number !== undefined && { hq_mobile_transfer_number }),
      ...(hq_mobile_transfer_label  !== undefined && { hq_mobile_transfer_label }),
      ...(hq_bank_transfer_mode     && { hq_bank_transfer_mode }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
