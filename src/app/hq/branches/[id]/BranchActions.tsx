'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PlayCircle, PauseCircle, Archive, AlertTriangle } from 'lucide-react'

type Status = 'active' | 'suspended' | 'archived'

export default function BranchActions({
  branchId,
  branchName,
  currentStatus,
  orgCount,
}: {
  branchId: string
  branchName: string
  currentStatus: Status
  orgCount: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'suspend' | 'archive' | null>(null)

  async function applyStatus(status: Status) {
    setLoading(status)
    setError(null)
    try {
      const res = await fetch(`/api/hq/branches/${branchId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed'); return }
      router.refresh()
    } finally {
      setLoading(null)
      setConfirm(null)
    }
  }

  if (currentStatus === 'archived') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-sm">
        <Archive className="w-4 h-4" />
        Archived — read-only
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Suspend / Reactivate */}
      {currentStatus === 'active' ? (
        <button
          onClick={() => setConfirm('suspend')}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-50 border border-yellow-300 text-yellow-800 hover:bg-yellow-100 transition-colors disabled:opacity-50"
        >
          {loading === 'suspended' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />}
          Suspend Branch
        </button>
      ) : (
        <button
          onClick={() => applyStatus('active')}
          disabled={!!loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 border border-green-300 text-green-800 hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          {loading === 'active' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          Reactivate Branch
        </button>
      )}

      {/* Archive */}
      <button
        onClick={() => setConfirm('archive')}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
        title={orgCount > 0 ? `Cannot archive — ${orgCount} org(s) still linked` : 'Archive branch (irreversible)'}
      >
        {loading === 'archived' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
        Archive
      </button>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {error}
        </p>
      )}

      {/* Confirm: suspend */}
      {confirm === 'suspend' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <PauseCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Suspend Branch?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <strong>{branchName}</strong> will be marked as suspended. The superadmin will lose dashboard access until reactivated.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => applyStatus('suspended')}
                className="flex-1 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-sm font-semibold"
              >
                Yes, Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm: archive */}
      {confirm === 'archive' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Archive className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Archive Branch?</h3>
                {orgCount > 0 ? (
                  <p className="text-sm text-red-600 mt-1">
                    Cannot archive — <strong>{orgCount} organisation(s)</strong> are still linked to this branch. Remove or reassign them first.
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">
                    <strong>{branchName}</strong> will be permanently archived and become read-only. This cannot be undone.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              {orgCount === 0 && (
                <button
                  onClick={() => applyStatus('archived')}
                  className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                >
                  Yes, Archive
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
