import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET — branch superadmin fetches HQ notices for their branch
// RLS on hq_notices already filters by branch; this just hits the table directly
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hq_notices')
    .select('id, title, body, priority, created_at, expires_at')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
