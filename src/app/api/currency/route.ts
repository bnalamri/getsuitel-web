import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 300

// Public endpoint — returns the platform's display currency
export async function GET() {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('platform_settings')
      .select('value')
      .eq('key', 'default_currency')
      .single()
    return NextResponse.json({ currency: data?.value ?? 'OMR' })
  } catch {
    return NextResponse.json({ currency: 'OMR' })
  }
}
