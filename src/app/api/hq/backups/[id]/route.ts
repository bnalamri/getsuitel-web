import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const BUCKET = 'platform-backups'

async function requireHQAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'hq_admin') return null
  return user
}

// DELETE — removes a backup row + its file. Only deletes the backup
// artifact itself, never touches live platform data.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireHQAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: backup } = await admin
    .from('platform_backups')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (backup?.storage_path) {
    await admin.storage.from(BUCKET).remove([backup.storage_path])
  }

  const { error } = await admin.from('platform_backups').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
