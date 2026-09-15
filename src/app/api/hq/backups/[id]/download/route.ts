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

// GET — returns a short-lived signed URL for the backup file. Never a
// public URL: the bucket holds full customer data across every org.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireHQAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: backup, error } = await admin
    .from('platform_backups')
    .select('storage_path, status, created_at')
    .eq('id', id)
    .single()

  if (error || !backup?.storage_path) {
    return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
  }

  // `download` sets Content-Disposition: attachment on the signed response,
  // so the browser saves the file instead of rendering the JSON inline.
  const filename = `getsuitel-backup-${backup.created_at.split('T')[0]}.json`
  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(backup.storage_path, 60, { download: filename }) // 60s — long enough to start the download

  if (signErr || !signed) {
    return NextResponse.json({ error: signErr?.message ?? 'Could not sign URL' }, { status: 500 })
  }

  return NextResponse.json({ url: signed.signedUrl })
}
