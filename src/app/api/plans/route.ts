import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 300 // cache 5 min

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load plans'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
