'use client'

import { useState } from 'react'

const priorityColor: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700', low: 'bg-slate-100 text-slate-600',
}
const statusColor: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700', assigned: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700', completed: 'bg-green-100 text-green-700',
  canceled: 'bg-slate-100 text-slate-400',
}
const STATUS_LABELS: Record<string, string> = {
  all: 'All Status', open: 'Open', assigned: 'Assigned',
  in_progress: 'In Progress', completed: 'Completed', canceled: 'Canceled',
}

type Request = {
  id: string
  title: string
  category: string | null
  description: string | null
  status: string
  priority: string
  created_at: string
  profiles: { full_name: string } | null
}

export default function MaintenanceList({ requests }: { requests: Request[] }) {
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status === statusFilter)

  return (
    <div className="space-y-3">
      {/* Filter row */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
        >
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <span className="text-sm text-slate-400">
          {filtered.length} request{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">
          No requests match the selected filter.
        </div>
      ) : (
        filtered.map(r => {
          const tech = r.profiles
          return (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{r.title}</div>
                  {r.category && (
                    <div className="text-sm text-slate-500 mt-0.5 capitalize">{r.category}</div>
                  )}
                  {r.description && (
                    <div className="text-xs text-slate-400 mt-1">{r.description}</div>
                  )}
                  <div className="text-xs mt-2">
                    {r.status === 'completed' && tech
                      ? <span className="text-green-600">Completed by <span className="font-medium">{tech.full_name}</span></span>
                      : tech
                        ? <span className="text-slate-500">Assigned to: <span className="font-medium text-slate-700">{tech.full_name}</span></span>
                        : <span className="text-amber-600 font-medium">Awaiting assignment</span>
                    }
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`badge ${priorityColor[r.priority] ?? 'bg-slate-100 text-slate-500'}`}>{r.priority}</span>
                  <span className={`badge ${statusColor[r.status] ?? 'bg-slate-100 text-slate-500'}`}>{r.status.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-3">
                {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
