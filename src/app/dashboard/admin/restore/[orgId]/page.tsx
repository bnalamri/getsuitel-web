'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RotateCcw, AlertTriangle, CheckCircle, Loader2, Calendar, Database, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Snapshot = {
  id: string
  snapshot_date: string
  row_counts: Record<string, number>
  created_at: string
}

const TABLE_LABELS: Record<string, string> = {
  properties: 'Properties',
  units: 'Units',
  tenants: 'Tenants',
  contracts: 'Contracts',
  invoices: 'Invoices',
  maintenance_requests: 'Maintenance',
  notices: 'Notices',
  cheques: 'Cheques',
  payment_receipts: 'Receipts',
  team_members: 'Team',
  staff_invitations: 'Invitations',
  org_payment_settings: 'Payment Settings',
}

export default function RestorePage() {
  const { orgId } = useParams<{ orgId: string }>()
  const router = useRouter()

  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Snapshot | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    fetch(`/api/admin/restore?orgId=${orgId}`)
      .then(r => r.json())
      .then(data => { setSnapshots(Array.isArray(data) ? data : []); setLoading(false) })
  }, [orgId])

  async function handleRestore() {
    if (!selected) return
    setRestoring(true)
    const res = await fetch('/api/admin/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshotId: selected.id }),
    })
    const json = await res.json()
    setRestoring(false)
    setConfirming(false)
    if (res.ok) {
      setResult({ ok: true, message: `Data restored to ${formatDate(selected.snapshot_date)}` })
    } else {
      setResult({ ok: false, message: json.error ?? 'Restore failed' })
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/admin/owners" className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw size={18} className="text-navy-700" /> Restore Owner Data
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Select a snapshot date to restore this owner's data to that point.</p>
        </div>
      </div>

      {/* Warning banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mb-6">
        <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>This is irreversible.</strong> All current data for this owner will be replaced with the selected snapshot.
          Any changes made after the snapshot date will be permanently lost.
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-xl p-4 flex gap-3 mb-6 ${result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {result.ok
            ? <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
            : <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />}
          <div className={`text-sm font-medium ${result.ok ? 'text-green-800' : 'text-red-800'}`}>{result.message}</div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : snapshots.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Database size={32} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">No snapshots yet</h3>
          <p className="text-slate-400 text-sm mt-1">Snapshots are taken automatically every day at 2:00 AM UTC.</p>
          <p className="text-slate-400 text-sm">You can also trigger one manually by visiting <code className="bg-slate-100 px-1 rounded">/api/cron/snapshot</code></p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 font-medium">{snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} available</p>
          {snapshots.map(snap => {
            const isSelected = selected?.id === snap.id
            const totalRows = Object.values(snap.row_counts ?? {}).reduce((a, b) => a + b, 0)
            return (
              <button
                key={snap.id}
                onClick={() => setSelected(isSelected ? null : snap)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  isSelected
                    ? 'border-navy-500 bg-navy-50 ring-2 ring-navy-200'
                    : 'border-slate-200 bg-white hover:border-navy-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className={isSelected ? 'text-navy-600' : 'text-slate-400'} />
                    <span className="font-semibold text-slate-900">{formatDate(snap.snapshot_date)}</span>
                  </div>
                  <span className="text-xs text-slate-400">{totalRows} total rows</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(snap.row_counts ?? {})
                    .filter(([, v]) => v > 0)
                    .map(([table, count]) => (
                      <span key={table} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {TABLE_LABELS[table] ?? table}: {count}
                      </span>
                    ))}
                </div>
              </button>
            )
          })}

          {selected && !confirming && !result && (
            <div className="pt-2">
              <button
                onClick={() => setConfirming(true)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> Restore to {formatDate(selected.snapshot_date)}
              </button>
            </div>
          )}

          {/* Confirmation step */}
          {confirming && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-2">
              <p className="font-semibold text-red-900 mb-1">Are you absolutely sure?</p>
              <p className="text-sm text-red-700 mb-4">
                This will permanently replace all current data with the {formatDate(selected!.snapshot_date)} snapshot.
                This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestore}
                  disabled={restoring}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {restoring ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                  {restoring ? 'Restoring…' : 'Yes, Restore Now'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
