'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronDown } from 'lucide-react'

const transitions: Record<string, string[]> = {
  pending:   ['deposited', 'cancelled'],
  deposited: ['cleared', 'bounced', 'cancelled'],
  bounced:   ['replaced', 'cancelled'],
  cleared:   [],
  cancelled: [],
  replaced:  [],
}

const labels: Record<string, string> = {
  deposited: 'Mark Deposited',
  cleared:   'Mark Cleared',
  bounced:   'Mark Bounced',
  cancelled: 'Cancel',
  replaced:  'Mark Replaced',
}

export default function UpdateChequeButton({
  chequeId,
  currentStatus,
}: {
  chequeId: string
  currentStatus: string
}) {
  const [loading, setLoading]       = useState(false)
  const [open, setOpen]             = useState(false)
  const [bounceReason, setBounce]   = useState('')
  const [pendingStatus, setPending] = useState<string | null>(null)
  const router = useRouter()

  const next = transitions[currentStatus] ?? []
  if (next.length === 0) return <span className="text-xs text-slate-300">—</span>

  async function apply(status: string) {
    setLoading(true)
    setOpen(false)
    setPending(null)
    const today = new Date().toISOString().split('T')[0]
    const body: Record<string, string> = { status }
    if (status === 'deposited') body.deposited_date = today
    if (status === 'cleared')   body.cleared_date   = today
    if (status === 'bounced' && bounceReason) body.bounce_reason = bounceReason
    await fetch(`/api/payments/cheques/${chequeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="relative">
      {loading ? (
        <Loader2 size={14} className="animate-spin text-slate-400"/>
      ) : (
        <>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg"
          >
            Update <ChevronDown size={11}/>
          </button>
          {open && (
            <div className="absolute right-0 top-7 z-20 bg-white shadow-xl border border-slate-200 rounded-xl overflow-hidden w-44">
              {next.map(s => (
                <div key={s}>
                  {s === 'bounced' && pendingStatus === 'bounced' ? (
                    <div className="p-2">
                      <input
                        className="input text-xs mb-1"
                        placeholder="Bounce reason (optional)"
                        value={bounceReason}
                        onChange={e => setBounce(e.target.value)}
                      />
                      <button
                        className="w-full text-xs bg-red-100 text-red-700 hover:bg-red-200 py-1 rounded font-semibold"
                        onClick={() => apply('bounced')}
                      >Confirm Bounce</button>
                    </div>
                  ) : (
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        if (s === 'bounced') { setPending('bounced'); return }
                        apply(s)
                      }}
                    >
                      {labels[s] ?? s}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
