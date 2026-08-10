'use client'
import { useState } from 'react'
import { Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

type State = 'idle' | 'running' | 'done' | 'error'

export default function CronRunButton({ job }: { job: string }) {
  const [state, setState] = useState<State>('idle')
  const [msg,   setMsg]   = useState('')

  async function run() {
    setState('running')
    setMsg('')
    try {
      const res = await fetch('/api/admin/trigger-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job }),
      })
      const json = await res.json()
      if (!res.ok || json.ok === false) {
        setMsg(json.error ?? `HTTP ${res.status}`)
        setState('error')
      } else {
        const summary = (
          json.message ?? json.summary
            ?? Object.entries(json)
                 .filter(([k]) => !['ok'].includes(k))
                 .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                 .join(' · ')
        ) || 'Done'
        setMsg(summary)
        setState('done')
        // Reset after 8s so the card doesn't stay green forever
        setTimeout(() => { setState('idle'); setMsg('') }, 8000)
      }
    } catch (e) {
      setMsg(String(e))
      setState('error')
    }
  }

  if (state === 'running') return (
    <button disabled className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-2.5 opacity-60 cursor-not-allowed">
      <Loader2 size={12} className="animate-spin" /> Running…
    </button>
  )

  if (state === 'done') return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1 text-emerald-700 text-xs font-medium">
        <CheckCircle size={12} /> Done
      </div>
      {msg && <p className="text-xs text-slate-500 text-right max-w-[180px] leading-tight">{msg}</p>}
    </div>
  )

  if (state === 'error') return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={run} className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-2.5 text-red-600 border-red-200 hover:bg-red-50">
        <AlertCircle size={12} /> Retry
      </button>
      {msg && <p className="text-xs text-red-500 text-right max-w-[180px] leading-tight">{msg}</p>}
    </div>
  )

  return (
    <button onClick={run} className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-2.5">
      <Play size={11} /> Run Now
    </button>
  )
}
