'use client'
import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Play, Pause, CheckCircle, Loader2, Volume2 } from 'lucide-react'
import { TOUR_STEPS } from '@/lib/demo/config'

type AudioRecord = { step_index: number; lang: string; audio_url: string; label: string | null }

function AudioCell({
  stepIndex, lang, record, onUploaded, onDeleted,
}: {
  stepIndex: number
  lang: 'en' | 'ar'
  record?: AudioRecord
  onUploaded: (r: AudioRecord) => void
  onDeleted: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function togglePlay() {
    if (!record) return
    if (!audioRef.current) {
      audioRef.current = new Audio(record.audio_url)
      audioRef.current.onended = () => setPlaying(false)
    }
    if (playing) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlaying(false)
    } else {
      audioRef.current.src = record.audio_url
      audioRef.current.play()
      setPlaying(true)
    }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('step_index', String(stepIndex))
    fd.append('lang', lang)
    fd.append('file', file)
    const res = await fetch('/api/admin/demo-audio', { method: 'POST', body: fd })
    const json = await res.json()
    setUploading(false)
    if (!res.ok) { setError(json.error); return }
    if (audioRef.current) { audioRef.current = null } // reset player
    onUploaded({ step_index: stepIndex, lang, audio_url: json.url, label: null })
  }

  async function handleDelete() {
    if (!confirm('Remove this audio file?')) return
    setDeleting(true)
    await fetch('/api/admin/demo-audio', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step_index: stepIndex, lang }),
    })
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setPlaying(false)
    setDeleting(false)
    onDeleted()
  }

  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-2 ${record ? 'border-emerald-200 bg-emerald-50' : 'border-dashed border-slate-200 bg-slate-50'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-bold uppercase tracking-wide ${lang === 'ar' ? 'text-purple-600' : 'text-blue-600'}`}>
          {lang === 'ar' ? 'عربي AR' : 'English EN'}
        </span>
        {record && <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />}
      </div>

      {record ? (
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-navy-400 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex-1"
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}
            {playing ? 'Pause' : 'Preview'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-400 hover:text-red-600 transition-colors p-1.5"
            title="Delete audio"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:border-navy-400 text-slate-500 hover:text-navy-700 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? 'Uploading…' : 'Upload audio'}
        </button>
      )}

      {/* Replace button if already has audio */}
      {record && (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs transition-colors py-0.5"
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
          {uploading ? 'Uploading…' : 'Replace'}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
        className="sr-only"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }}
      />
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}

export default function DemoAudioPage() {
  const [records, setRecords] = useState<AudioRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/demo-audio')
      .then(r => r.json())
      .then(data => { setRecords(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  function getRecord(stepIndex: number, lang: string) {
    return records.find(r => r.step_index === stepIndex && r.lang === lang)
  }

  function upsertRecord(r: AudioRecord) {
    setRecords(prev => {
      const next = prev.filter(x => !(x.step_index === r.step_index && x.lang === r.lang))
      return [...next, r]
    })
  }

  function removeRecord(stepIndex: number, lang: string) {
    setRecords(prev => prev.filter(r => !(r.step_index === stepIndex && r.lang === lang)))
  }

  const totalSteps = TOUR_STEPS.length
  const uploadedEn = records.filter(r => r.lang === 'en').length
  const uploadedAr = records.filter(r => r.lang === 'ar').length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Volume2 size={20} className="text-navy-700" />
          <h1 className="text-xl font-bold text-slate-900">Demo Tour Audio</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Upload pre-recorded audio narration for each tour step. Uploaded files take priority over browser speech synthesis.
        </p>
      </div>

      {/* Progress */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-700">{uploadedEn}/{totalSteps}</div>
          <div className="text-xs text-blue-500 font-medium mt-0.5">English steps uploaded</div>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <div className="text-2xl font-bold text-purple-700">{uploadedAr}/{totalSteps}</div>
          <div className="text-xs text-purple-500 font-medium mt-0.5">Arabic steps uploaded</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {TOUR_STEPS.map((step, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-navy-800 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{step.title}</div>
                  <div className="text-slate-400 text-xs mt-0.5 line-clamp-1">{step.description}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <AudioCell
                  stepIndex={i}
                  lang="en"
                  record={getRecord(i, 'en')}
                  onUploaded={upsertRecord}
                  onDeleted={() => removeRecord(i, 'en')}
                />
                <AudioCell
                  stepIndex={i}
                  lang="ar"
                  record={getRecord(i, 'ar')}
                  onUploaded={upsertRecord}
                  onDeleted={() => removeRecord(i, 'ar')}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Tip:</strong> Accepted formats: MP3, WAV, OGG, M4A, AAC. For best results use MP3 at 128kbps.
        Files are served via Supabase Storage CDN. Uploading a new file automatically replaces the old one.
      </div>
    </div>
  )
}
