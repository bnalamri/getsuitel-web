'use client'
import { useState } from 'react'
import { Send, Check, Loader2 } from 'lucide-react'

export default function ResendVerificationButton({
  userId,
  email,
  name,
}: {
  userId: string
  email: string
  name: string
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleResend() {
    setState('loading')
    const res = await fetch('/api/tenants/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, name }),
    })
    const json = await res.json()
    if (!res.ok) { setErrorMsg(json.error ?? 'Failed'); setState('error'); return }
    setState('sent')
  }

  if (state === 'sent') return (
    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
      <Check size={13} /> Verification email sent
    </span>
  )

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleResend}
        disabled={state === 'loading'}
        className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {state === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
        Resend Verification
      </button>
      {state === 'error' && <span className="text-xs text-red-500">{errorMsg}</span>}
    </div>
  )
}
