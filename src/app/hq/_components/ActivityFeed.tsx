import { createClient } from '@/lib/supabase/server'
import { Wrench, Building2, Users, FileText } from 'lucide-react'

type Event = {
  id: string
  type: 'maintenance' | 'org' | 'tenant' | 'invoice'
  title: string
  branch: string | null
  time: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const TYPE_ICON: Record<string, React.ElementType> = {
  maintenance: Wrench,
  org:         Building2,
  tenant:      Users,
  invoice:     FileText,
}
const TYPE_COLOR: Record<string, string> = {
  maintenance: 'bg-amber-100 text-amber-600',
  org:         'bg-blue-100 text-blue-600',
  tenant:      'bg-purple-100 text-purple-600',
  invoice:     'bg-green-100 text-green-600',
}
const TYPE_LABEL: Record<string, string> = {
  maintenance: 'Maintenance request',
  org:         'New organisation',
  tenant:      'New tenant',
  invoice:     'Invoice created',
}

export default async function ActivityFeed() {
  const supabase = await createClient()

  // Fetched individually via destructured { data } — a query that errors
  // (wrong column name, RLS denial, etc.) silently resolves to `data: null`
  // rather than throwing, so a broken source just yields zero events for
  // that type instead of surfacing an error. Two of the four below used to
  // fail exactly this way: `tenants` has no `name` column (it's
  // `full_name`), and `invoices` has no `title` column at all — so "New
  // tenant" and "Invoice created" never appeared here despite the UI below
  // fully supporting both event types.
  const [
    { data: recentMaint },
    { data: recentOrgs },
    { data: recentTenants },
    { data: recentInvoices },
  ] = await Promise.all([
    supabase
      .from('maintenance_requests')
      .select('id, title, created_at, organizations!inner(name, branch_id, branches(display_name))')
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('organizations')
      .select('id, name, created_at, branch_id, branches(display_name)')
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('tenants')
      .select('id, full_name, created_at, organizations!inner(name, branch_id, branches(display_name))')
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('invoices')
      .select('id, type, amount, currency, created_at, organizations!inner(name, branch_id, branches(display_name))')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const events: Event[] = [
    ...(recentMaint ?? []).map(r => ({
      id:     `m-${r.id}`,
      type:   'maintenance' as const,
      title:  r.title,
      branch: ((r.organizations as { branches: { display_name: string } | null } | null)?.branches?.display_name) ?? null,
      time:   r.created_at,
    })),
    ...(recentOrgs ?? []).map(r => ({
      id:     `o-${r.id}`,
      type:   'org' as const,
      title:  r.name,
      branch: ((r as { branches: { display_name: string } | null }).branches?.display_name) ?? null,
      time:   r.created_at,
    })),
    ...(recentTenants ?? []).map(r => ({
      id:     `t-${r.id}`,
      type:   'tenant' as const,
      title:  r.full_name,
      branch: ((r.organizations as { branches: { display_name: string } | null } | null)?.branches?.display_name) ?? null,
      time:   r.created_at,
    })),
    ...(recentInvoices ?? []).map(r => ({
      id:     `i-${r.id}`,
      // No `title` column on invoices — compose a readable one from what
      // the row actually has (e.g. "Rent invoice — OMR 250.00").
      type:   'invoice' as const,
      title:  `${r.type.charAt(0).toUpperCase()}${r.type.slice(1)} invoice — ${r.currency} ${Number(r.amount).toFixed(2)}`,
      branch: ((r.organizations as { branches: { display_name: string } | null } | null)?.branches?.display_name) ?? null,
      time:   r.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 12)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Recent Activity</h2>
        <p className="text-xs text-gray-400 mt-0.5">Latest events across all branches</p>
      </div>
      {events.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-400">No activity yet</div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {events.map(e => {
            const Icon = TYPE_ICON[e.type]
            return (
              <li key={e.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${TYPE_COLOR[e.type]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.title}</p>
                  <p className="text-xs text-gray-400">
                    <span className="text-gray-500">{TYPE_LABEL[e.type]}</span>
                    {e.branch && <> · <span>{e.branch}</span></>}
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(e.time)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
