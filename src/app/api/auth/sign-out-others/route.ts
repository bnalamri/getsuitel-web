// @ts-nocheck
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

/** Ends every other open session for the caller (keeps the current one). Mobile sends Bearer; web uses cookie. */
export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  let jwt = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!jwt) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    jwt = session?.access_token ?? null
  }
  if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.signOut(jwt, 'others')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
