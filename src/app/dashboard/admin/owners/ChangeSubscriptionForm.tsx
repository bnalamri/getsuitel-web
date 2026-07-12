'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings2, Loader2, X, Calendar, Clock, AlertTriangle } from 'lucide-react'

const DURATION_OPTIONS = [
  { label: '1 month',   value: 1  },
  { label: '3 months',  value: 3  },
  { label: '6 months',  value: 6  },
  { label: '1 year',    value: 12 },
  { label: '2 years',   value: 24 },
]

export default function ChangeSubscriptionForm({
  orgId, currentPlan, currentStatus, currentExpiresAt, currentTrialEndsAt,
}: {
  orgId: string
  currentPlan: string
  currentStatus: string
  currentExpiresAt?: string | null
  currentTrialEndsAt?: string | null
}) {
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [plan, setPlan]         = useState(currentPlan)
  const [status, setStatus]     = useState(currentStatus)

  // Activation options (when status = active)
  const [activationMode, setActivationMode] = useState<'duration' | 'exact'>('duration')
  const [durationMonths, setDurationMonths] = useState(1)
  const [exactDate, setExactDate]           = useState('')

  // Trial extension (when status = trialing)
  const [trialExtendDays, setTrialExtendDays] = useState('')

  const router = useRouter()

  function resetAndClose() {
    setPlan(currentPlan)
    setStatus(currentStatus)
    setActivationMode('duration')
    setDurationMonths(1)
    setExactDate('')
    setTrialExtendDays('')
    setError('')
    setOpen(false)
  }

  async function handleSave() {
    setError('')

    // Validate exact date if chosen
    if (status === 'active' && activationMode === 'exact' && !exactDate) {
      setError('Please select an expiry date.')
      return
    }

    setLoading(true)
    const body: Record<string, unknown> = { orgId, plan, status }
    if (status === 'active') {
      if (activationMode === 'duration') body.durationMonths = durationMonths
      else body.exactExpiryDate = exactDate
    }
    if (status === 'trialing' && trialExtendDays) {
      body.trialExtendDays = Number(trialExtendDays)
    }

    const res = await fetch('/api/admin/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error || 'Failed to update subscription.')
      return
    }

    setOpen(false)
    router.refresh()
  }

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5"
    >
      <Settings2 size={13} /> Manage
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-slate-900">Manage Subscription</h2>
          <button onClick={resetAndClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Plan */}
          <div>
            <label className="label">Plan</label>
            <select className="input" value={plan} onChange={e => setPlan(e.target.value)}>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="trialing">Trialing</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>

          {/* ── Active: duration or exact date ── */}
          {status === 'active' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                <Calendar size={12}/> Activation Period
              </div>
              {currentExpiresAt && (
                <p className="text-xs text-emerald-700">
                  Current expiry: <strong>{fmtDate(currentExpiresAt)}</strong>
                </p>
              )}

              {/* Mode toggle */}
              <div className="flex rounded-lg overflow-hidden border border-emerald-300 text-xs">
                <button
                  onClick={() => setActivationMode('duration')}
                  className={`flex-1 py-1.5 font-medium transition-colors ${activationMode === 'duration' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 hover:bg-emerald-50'}`}
                >
                  Duration
                </button>
                <button
                  onClick={() => setActivationMode('exact')}
                  className={`flex-1 py-1.5 font-medium transition-colors ${activationMode === 'exact' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 hover:bg-emerald-50'}`}
                >
                  Exact Date
                </button>
              </div>

              {activationMode === 'duration' ? (
                <select
                  className="input text-sm"
                  value={durationMonths}
                  onChange={e => setDurationMonths(Number(e.target.value))}
                >
                  {DURATION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="date"
                  className="input text-sm"
                  value={exactDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setExactDate(e.target.value)}
                />
              )}

              <p className="text-xs text-emerald-600">
                {activationMode === 'duration'
                  ? 'Extends from current expiry if still in future, otherwise from today.'
                  : 'Sets subscription expiry to this specific date.'}
              </p>
            </div>
          )}

          {/* ── Trialing: extend trial ── */}
          {status === 'trialing' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2">
              <div className="text-xs font-semibold text-yellow-800 flex items-center gap-1.5">
                <Clock size={12}/> Extend Trial Period
              </div>
              {currentTrialEndsAt && (
                <p className="text-xs text-yellow-700">
                  Trial ends: <strong>{fmtDate(currentTrialEndsAt)}</strong>
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="input text-sm w-24"
                  placeholder="Days"
                  min={1}
                  max={365}
                  value={trialExtendDays}
                  onChange={e => setTrialExtendDays(e.target.value)}
                />
                <span className="text-xs text-yellow-700">days to add (leave blank to keep current)</span>
              </div>
            </div>
          )}

          {/* ── Canceled warning ── */}
          {status === 'canceled' && currentStatus !== 'canceled' && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5"/>
              Cancellation email will be sent to the owner. Data retained for 90 days.
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={resetAndClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
