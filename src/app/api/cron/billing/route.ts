import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBilling } from '../../hq/billing/route'

// Runs on 1st of each month at 02:00 UTC
// Generates branch_billing records for the previous calendar month
export async function GET() {
  try {
    const supabase = await createClient()

    // Previous month
    const now = new Date()
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthKey = prevMonthStart.toISOString().substring(0, 10)

    const result = await generateBilling(supabase, monthKey, prevMonthStart, prevMonthEnd)
    const body = await result.json()

    return NextResponse.json({
      ok: true,
      month: monthKey,
      ...body,
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
