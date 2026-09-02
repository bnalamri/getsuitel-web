import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/hq/branches/[id]/audit?action=all&from=date&to=date&limit=100
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['hq_admin', 'hq_finance', 'hq_staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url    = new URL(req.url)
  const action = url.searchParams.get('action') // e.g. 'status_change', 'limits_update', or null for all
  const from   = url.searchParams.get('from')   // ISO date string
  const to     = url.searchParams.get('to')
  const limit  = Math.min(parseInt(url.searchParams.get('limit') ?? '200', 10), 500)

  let query = supabase
    .from('hq_audit_logs')
    .select(`
      id, action, details, created_at,
      profiles!hq_audit_logs_actor_id_fkey ( full_name, email )
    `)
    .eq('branch_id', params.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (action && action !== 'all') query = query.eq('action', action)
  if (from) query = query.gte('created_at', from)
  if (to)   query = query.lte('created_at', to + 'T23:59:59Z')

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
