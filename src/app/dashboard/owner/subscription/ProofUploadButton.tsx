'use client'
import { useState, useRef } from 'react'
import { Upload, Paperclip, X, Loader2, CheckCircle, Send } from 'lucide-react'

interface Props {
  orgId: string
  ownerEmail: string
  ownerName: string
  plan: string
}

export default function ProofUploadButton({ orgId, ownerEmail, ownerName, plan }: Props) {
  const [file, setFile]       = useState<File | null>(null)
  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  async function submit() {
    if (!file) return
    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('organization_id', orgId)
    fd.append('owner_email', ownerEmail)
    fd.append('owner_name', ownerName)
    fd.append('plan', plan)
    if (notes) fd.append('notes', notes)

    const res = await fetch('/api/subscription/proof', { method: 'POST', body: fd })

    setLoading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Submission failed — please try again.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-medium">
        <CheckCircle size={16}/> Payment proof submitted — our billing team will update your plan within 24 hours.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
          <Paperclip size={14} className="text-emerald-600 flex-shrink-0"/>
          <span className="text-emerald-700 font-medium flex-1 truncate">{file.name}</span>
          <button onClick={() => { setFile(null); if (ref.current) ref.current.value = '' }}
            className="text-slate-400 hover:text-slate-600">
            <X size={14}/>
          </button>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          className="flex items-center gap-2 w-full border-2 border-dashed border-slate-200 rounded-xl px-4 py-4 text-sm text-slate-500 hover:border-navy-300 hover:bg-slate-50 transition-colors"
        >
          <Upload size={16} className="text-slate-400"/>
          Click to attach your bank/mobile transfer slip (image or PDF)
        </button>
      )}

      <textarea
        className="input text-sm"
        rows={2}
        placeholder="Notes (optional) — e.g. transfer reference, date"
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />

      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <button
        onClick={submit}
        disabled={!file || loading}
        className="btn-primary flex items-center gap-2 text-sm w-full justify-center disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
        Submit Payment Proof
      </button>
    </div>
  )
}
