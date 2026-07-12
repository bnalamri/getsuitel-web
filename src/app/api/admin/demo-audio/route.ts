import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireSuperadmin } from '@/lib/api-auth'

const BUCKET = 'demo-audio'

async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await admin.storage.listBuckets()
  if (!buckets?.find(b => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true, allowedMimeTypes: ['audio/*'] })
  }
}

// GET — list all demo audio records (accessible to any authenticated user for the demo panel)
export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('demo_audio')
    .select('*')
    .order('step_index')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — upload audio file for a step/lang (super admin only)
export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const formData = await request.formData()
  const stepIndex = Number(formData.get('step_index'))
  const lang = formData.get('lang') as string
  const label = formData.get('label') as string | null
  const file = formData.get('file') as File | null

  if (!file || isNaN(stepIndex) || !['en', 'ar'].includes(lang)) {
    return NextResponse.json({ error: 'Missing step_index, lang, or file' }, { status: 400 })
  }

  const admin = createAdminClient()
  await ensureBucket(admin)

  const ext = file.name.split('.').pop() ?? 'mp3'
  const path = `step_${stepIndex}_${lang}.${ext}`

  // Remove old file if exists (ignore errors)
  await admin.storage.from(BUCKET).remove([path])

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'audio/mpeg' })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path)
  const audioUrl = `${urlData.publicUrl}?t=${Date.now()}` // cache-bust on re-upload

  const { error: dbErr } = await admin
    .from('demo_audio')
    .upsert(
      { step_index: stepIndex, lang, audio_url: audioUrl, label: label ?? null },
      { onConflict: 'step_index,lang' }
    )

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ ok: true, url: audioUrl })
}

// DELETE — remove audio for a step/lang (super admin only)
export async function DELETE(request: NextRequest) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  const { step_index, lang } = await request.json()
  if (isNaN(Number(step_index)) || !['en', 'ar'].includes(lang)) {
    return NextResponse.json({ error: 'Invalid step_index or lang' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Find the record to get the file path
  const { data: record } = await admin
    .from('demo_audio')
    .select('audio_url')
    .eq('step_index', step_index)
    .eq('lang', lang)
    .single()

  if (record?.audio_url) {
    // Extract path from URL
    const url = new URL(record.audio_url)
    const path = url.pathname.split(`/object/public/${BUCKET}/`)[1]?.split('?')[0]
    if (path) await admin.storage.from(BUCKET).remove([path])
  }

  await admin.from('demo_audio').delete().eq('step_index', step_index).eq('lang', lang)
  return NextResponse.json({ ok: true })
}
