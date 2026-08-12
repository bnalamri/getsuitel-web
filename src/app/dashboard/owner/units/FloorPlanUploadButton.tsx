'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, Trash2, Loader2, Maximize2 } from 'lucide-react'
import Image from 'next/image'

export default function FloorPlanUploadButton({
  unitId,
  unitNumber,
  currentUrl,
  readOnly = false,
}: {
  unitId: string
  unitNumber: string
  currentUrl: string | null
  readOnly?: boolean
}) {
  const router    = useRouter()
  const inputRef  = useRef<HTMLInputElement>(null)
  const [loading, setLoading]   = useState(false)
  const [preview, setPreview]   = useState<string | null>(currentUrl)
  const [lightbox, setLightbox] = useState(false)
  const [error, setError]       = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setError('')

    const fd = new FormData()
    fd.append('unitId', unitId)
    fd.append('file', file)

    const res  = await fetch('/api/units/floor-plan', { method: 'POST', body: fd })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? 'Upload failed'); return }
    setPreview(json.url)
    router.refresh()
  }

  async function handleRemove() {
    if (!confirm(`Remove floor plan for Unit ${unitNumber}?`)) return
    setLoading(true); setError('')
    const res = await fetch('/api/units/floor-plan', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId }),
    })
    setLoading(false)
    if (!res.ok) { setError('Remove failed'); return }
    setPreview(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {preview ? (
          <>
            {/* Thumbnail — click to fullscreen */}
            <button
              onClick={() => setLightbox(true)}
              className="relative w-10 h-10 rounded-md overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors group"
              title="View floor plan"
            >
              <Image src={preview} alt="Floor plan" fill className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                <Maximize2 size={12} className="text-white opacity-0 group-hover:opacity-100" />
              </div>
            </button>
            {/* Replace */}
            <button
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
              title="Replace floor plan"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            </button>
            {/* Remove */}
            <button
              onClick={handleRemove}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
              title="Remove floor plan"
            >
              <Trash2 size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 border border-dashed border-slate-300 rounded-md hover:border-blue-400 hover:text-blue-600 transition-colors"
            title="Upload floor plan"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
            {loading ? 'Uploading…' : 'Floor plan'}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* Lightbox */}
      {lightbox && preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(false)}
              className="absolute -top-8 right-0 text-white/70 hover:text-white text-sm"
            >
              ✕ Close
            </button>
            <img src={preview} alt={`Unit ${unitNumber} floor plan`} className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
            <p className="text-center text-white/60 text-xs mt-2">Unit {unitNumber} — Floor Plan</p>
          </div>
        </div>
      )}
    </>
  )
}
