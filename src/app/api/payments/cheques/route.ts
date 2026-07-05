import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/payments/cheques?orgId=xxx
export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })

  const { data, error } = await supabase
    .from('cheques')
    .select('*, tenants(full_name), units(unit_number, properties(name)), contracts(id)')
    .eq('organization_id', orgId)
    .order('due_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/payments/cheques — register one or multiple cheques
export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()
  const { cheques } = body  // array of cheque objects

  if (!Array.isArray(cheques) || cheques.length === 0)
    return NextResponse.json({ error: 'No cheques provided' }, { status: 400 })

  const { data, error } = await supabase.from('cheques').insert(cheques).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
