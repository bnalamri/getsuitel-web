'use client'
import { useEffect, useState, useCallback } from 'react'
import { Download, Loader2, RotateCcw, AlertTriangle, PlayCircle, X } from 'lucide-react'

type Backup = {
  id: string
  created_at: string
  trigger_type: 'cron' | 'manual'
  status: 'running' | 'success' | 'partial' | 'error'
  size_bytes: number | null
  row_counts: Record<string, number> | null
  error_msg: string | null
  duration_ms: number | null
}

const STATUS_STYLE: Record<Backup['status'], string> = {
  success: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  running: 'bg-gray-100 text-gray-600',
}

function fmtSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function totalRows(rowCounts: Record<string, number> | null) {
  if (!rowCounts) return 0
  return Object.values(rowCounts).reduce((a, b) => a + b, 0)
}

export default function HQBackupsClient() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [restoreResult, setRestoreResult] = useState<{ ok: boolean; restoreCounts?: Record<string, number>; errors?: string[] } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/hq/backups')
    if (res.ok) setBackups(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function runNow() {
    setRunning(true)
    await fetch('/api/hq/backups', { method: 'POST' })
    await load()
    setRunning(false)
  }

  async function download(id: string) {
    setDownloadingId(id)
    const res = await fetch(`/api/hq/backups/${id}/download`)
    const body = await res.json()
    setDownloadingId(null)
    if (body.url) window.open(body.url, '_blank')
    else alert(body.error ?? 'Could not download this backup')
  }

  function openRestore(b: Backup) {
    setRestoreTarget(b)
    setConfirmText('')
    setRestoreResult(null)
  }

  async function doRestore() {
    if (!restoreTarget) return
    setRestoring(true)
    const res = await fetch(`/api/hq/backups/${restoreTarget.id}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: confirmText }),
    })
    const body = await res.json()
    setRestoring(false)
    setRestoreResult(body)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{backups.length} backup{backups.length === 1 ? '' : 's'} on file</p>
        <button
          onClick={runNow}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          Run Backup Now
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : backups.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No backups yet — run one now, or wait for tonight&apos;s scheduled run.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Trigger</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Rows</th>
                <th className="text-left px-4 py-2">Size</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {backups.map(b => (
                <tr key={b.id}>
                  <td className="px-4 py-2.5 text-gray-800">{new Date(b.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-gray-500 capitalize">{b.trigger_type}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[b.status]}`}>{b.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{totalRows(b.row_counts).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-gray-500">{fmtSize(b.size_bytes)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => download(b.id)}
                        disabled={downloadingId === b.id || b.status === 'running'}
                        className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {downloadingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Download
                      </button>
                      <button
                        onClick={() => openRestore(b)}
                        disabled={b.status === 'running'}
                        className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {restoreTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">Restore from {new Date(restoreTarget.created_at).toLocaleString()}?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Every row that existed at backup time gets written back to its backed-up state, and any row
                  deleted since then is brought back. Rows created <strong>after</strong> this backup are left
                  alone — this is not a full wipe. Owner and staff accounts (<code>profiles</code>) are never
                  touched by restore.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Type <code className="bg-gray-100 px-1 rounded">{restoreTarget.created_at}</code> below to confirm.
                </p>
              </div>
            </div>

            {!restoreResult ? (
              <>
                <input
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder={restoreTarget.created_at}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setRestoreTarget(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                  <button
                    onClick={doRestore}
                    disabled={confirmText !== restoreTarget.created_at || restoring}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
                  >
                    {restoring && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Restore
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className={`text-sm font-medium ${restoreResult.ok ? 'text-green-700' : 'text-amber-700'}`}>
                  {restoreResult.ok ? 'Restore completed successfully.' : 'Restore completed with some errors — see below.'}
                </p>
                {restoreResult.restoreCounts && (
                  <p className="text-xs text-gray-500">
                    Rows restored: {Object.values(restoreResult.restoreCounts).reduce((a, b) => a + b, 0).toLocaleString()}
                  </p>
                )}
                {!!restoreResult.errors?.length && (
                  <ul className="text-xs text-red-600 list-disc pl-4 space-y-0.5">
                    {restoreResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => { setRestoreTarget(null); load() }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
                  >
                    <X className="w-3.5 h-3.5" /> Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
