import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// PATCH /api/payments/settings — update org payment settings
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { org_id, bank_account_name, bank_account_number, bank_name, bank_iban,
          mobile_wallet_number, mobile_wallet_label } = body

  if (!org_id) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 })

  const { data, error } = await supabase
    .from('organizations')
    .update({
      bank_account_name,
      bank_account_number,
      bank_name,
      bank_iban,
      mobile_wallet_number,
      mobile_wallet_label: mobile_wallet_label || 'Mobile Wallet',
    })
    .eq('id', org_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
