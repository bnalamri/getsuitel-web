import { createAdminClient } from '@/lib/supabase/server'
import { Wrench, AlertTriangle } from 'lucide-react'
import BranchFilterSelect from '../_components/BranchFilterSelect'
import StatusFilterSelect from '../_components/StatusFilterSelect'
import ExportCSVButton from '../_components/ExportCSVButton'

const STATUS_COLORS: Record<string, string> = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-gray-100 text-gray-400',
}

export default async function HQMaintenanceReportPage({
  searchParams,
}: { searchParams: Promise<{ branch?: string; status?: string }> }) {
  const supabase = createAdminClient()
  const { branch: branchId, status: statusFilter } = await searchParams

  // Fetch branches, requests, and orgs in parallel (avoid embedded join — FK may not be in cache)
  const [{ data: branches }, { data: requests, error: reqErr }, { data: orgs }] = await Promise.all([
    supabase.from('branches').select('id, display_name').in('status', ['active', 'suspended']).order('display_name'),
    supabase
      .from('maintenance_requests')
      .select('id, title, status, priority, created_at, organization_id, technician_id, profiles ( full_name )')
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('organizations')
      .select('id, name, branch_id, branches ( display_name )'),
  ])

  // Build org lookup map
  type OrgLookup = { name: string; branch_id: string | null; branch_name: string }
  const orgMap: Record<string, OrgLookup> = {}
  ;(orgs ?? []).forEach((o: { id: string; name: string; branch_id: string | null; branches: { display_name: string } | null }) => {
    orgMap[o.id] = {
      name: o.name,
      branch_id: o.branch_id,
      branch_name: (o.branches as { display_name: string } | null)?.display_name ?? '—',
    }
  })

  const now = Date.now()

  let rows = ((requests ?? []) as {
    id: string; title: string; status: string; priority: string; created_at: string
    organization_id: string | null; technician_id: string | null
    profiles: { full_name: string } | null
  }[]).map(r => {
    const org      = r.organization_id ? orgMap[r.organization_id] : null
    const daysOpen = Math.floor((now - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24))
    const overdue  = r.status !== 'completed' && r.status !== 'cancelled' && daysOpen > 7
    return {
      id:         r.id,
      title:      r.title,
      branch:     org?.branch_name ?? '—',
      branch_id:  org?.branch_id ?? null,
      org:        org?.name ?? '—',
      status:     r.status,
      priority:   r.priority ?? '—',
      assigned:   r.profiles?.full_name ?? 'Unassigned',
      days_open:  daysOpen,
      overdue,
      date:       new Date(r.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' }),
    }
  })

  if (branchId) rows = rows.filter(r => r.branch_id === branchId)
  if (statusFilter && statusFilter !== 'all') rows = rows.filter(r => r.status === statusFilter)

  const openCount      = rows.filter(r => r.status === 'open').length
  const inProgressCount = rows.filter(r => r.status === 'in_progress').length
  const overdueCount   = rows.filter(r => r.overdue).length

  const csvData    = rows.map(({ id: _, branch_id: __, overdue: ___, ...r }) => r)
  const csvHeaders = ['Title', 'Branch', 'Organisation', 'Status', 'Priority', 'Assigned', 'Days Open', 'Date']

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Report</h1>
          <p className="text-sm text-gray-500">Open and closed jobs across all branches</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BranchFilterSelect branches={branches ?? []} selected={branchId ?? null} basePath="/hq/reports/maintenance" />
          <StatusFilterSelect selected={statusFilter ?? null} basePath="/hq/reports/maintenance" />
          <ExportCSVButton data={csvData} headers={csvHeaders} filename={`hq-maintenance-${new Date().toISOString().substring(0,10)}.csv`} />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open',        value: openCount,       color: 'bg-blue-50 text-blue-700'   },
          { label: 'In Progress', value: inProgressCount, color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Overdue (>7d)', value: overdueCount,  color: 'bg-red-50 text-red-700'     },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-gray-200 p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{rows.length} requests</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Title</th>
                <th className="px-5 py-3 text-left">Branch</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Priority</th>
                <th className="px-5 py-3 text-left">Assigned</th>
                <th className="px-5 py-3 text-right">Days Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!rows.length ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No maintenance requests found</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 ${r.overdue ? 'bg-red-50/30' : ''}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      {r.overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                      <span className="font-medium text-gray-900">{r.title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{r.branch}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{r.priority}</td>
                  <td className="px-5 py-3 text-gray-600">{r.assigned}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={r.overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}>{r.days_open}d</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
