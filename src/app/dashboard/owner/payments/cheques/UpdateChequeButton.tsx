'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronDown } from 'lucide-react'

const transitions: Record<string, string[]> = {
  pending:   ['deposited', 'returned', 'cancelled'],
  deposited: ['cleared', 'bounced', 'returned', 'cancelled'],
  bounced:   ['replaced', 'cancelled'],
  returned:  ['replaced', 'cancelled'],
  cleared:   [],
  cancelled: [],
  replaced:  [],
}

const labels: Record<string, string> = {
  deposited: 'Mark Deposited',
  cleared:   'Mark Cleared',
  bounced:   'Mark Bounced (NSF)',
  returned:  'Mark Returned (Technical)',
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
  const [bounceReason, setBounce]    = useState('')
  const [returnReason, setReturn]    = useState('')
  const [pendingStatus, setPending]  = useState<string | null>(null)
  const [pos, setPos]               = useState({ top: 0, right: 0 })
  const btnRef                      = useRef<HTMLButtonElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (!(e.target as Element).closest('[data-cheque-dropdown]')) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const next = transitions[currentStatus] ?? []
  if (next.length === 0) return <span className="text-xs text-slate-300">—</span>

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setOpen(o => !o)
  }

  async function apply(status: string) {
    setLoading(true)
    setOpen(false)
    setPending(null)
    const today = new Date().toISOString().split('T')[0]
    const body: Record<string, string> = { status }
    if (status === 'deposited') body.deposited_date = today
    if (status === 'cleared')   body.cleared_date   = today
    if (status === 'bounced'   && bounceReason) body.bounce_reason  = bounceReason
    if (status === 'returned'  && returnReason) body.return_reason  = returnReason
    await fetch(`/api/payments/cheques/${chequeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="relative" data-cheque-dropdown>
      {loading ? (
        <Loader2 size={14} className="animate-spin text-slate-400"/>
      ) : (
        <>
          <button
            ref={btnRef}
            onClick={handleOpen}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg"
          >
            Update <ChevronDown size={11}/>
          </button>
          {open && (
            <div
              data-cheque-dropdown
              style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
              className="bg-white shadow-xl border border-slate-200 rounded-xl overflow-hidden w-44"
            >
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
                      >Confirm Bounce (NSF)</button>
                    </div>
                  ) : s === 'returned' && pendingStatus === 'returned' ? (
                    <div className="p-2">
                      <input
                        className="input text-xs mb-1"
                        placeholder="e.g. Signature required"
                        value={returnReason}
                        onChange={e => setReturn(e.target.value)}
                      />
                      <button
                        className="w-full text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 py-1 rounded font-semibold"
                        onClick={() => apply('returned')}
                      >Confirm Return</button>
                    </div>
                  ) : (
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        if (s === 'bounced')  { setPending('bounced');  return }
                        if (s === 'returned') { setPending('returned'); return }
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
