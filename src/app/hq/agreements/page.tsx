import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle2, Clock, FileText, ScrollText, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AgreementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['hq_admin', 'hq_finance', 'hq_staff'].includes(profile.role)) {
    redirect('/hq')
  }

  // Load all branches with their agreement status
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name, city, country, status')
    .order('name')

  const { data: agreements } = await supabase
    .from('branch_agreements')
    .select('branch_id, exported_at, signed_at, signed_doc_name, effective_date')

  const agreementMap = new Map(agreements?.map(a => [a.branch_id, a]) ?? [])

  const rows = (branches ?? []).map(b => ({
    ...b,
    agreement: agreementMap.get(b.id) ?? null,
  }))

  const total    = rows.length
  const signed   = rows.filter(r => r.agreement?.signed_at).length
  const exported = rows.filter(r => r.agreement?.exported_at && !r.agreement?.signed_at).length
  const draft    = rows.filter(r => r.agreement && !r.agreement?.exported_at).length
  const none     = rows.filter(r => !r.agreement).length

  function statusBadge(row: typeof rows[0]) {
    if (!row.agreement) return { label: 'Not Started', color: 'bg-gray-100 text-gray-500', Icon: Clock }
    if (row.agreement.signed_at) return { label: 'Signed', color: 'bg-green-100 text-green-700', Icon: CheckCircle2 }
    if (row.agreement.exported_at) return { label: 'Exported', color: 'bg-blue-100 text-blue-700', Icon: FileText }
    return { label: 'Draft', color: 'bg-amber-100 text-amber-700', Icon: Clock }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ScrollText className="h-6 w-6 text-yellow-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Branch Agreements</h1>
          <p className="text-sm text-gray-500">Franchise agreement status across all branches</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Signed',      value: signed,   color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Exported',    value: exported,  color: 'text-blue-600',  bg: 'bg-blue-50'  },
          { label: 'Draft',       value: draft,     color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Not Started', value: none,      color: 'text-gray-500',  bg: 'bg-gray-50'  },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Effective Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Signed Document</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => {
                const { label, color, Icon } = statusBadge(row)
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{row.name}</div>
                      {(row.city || row.country) && (
                        <div className="text-xs text-gray-400">{[row.city, row.country].filter(Boolean).join(', ')}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
                        <Icon className="h-3 w-3" />
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-gray-500">
                      {row.agreement?.effective_date
                        ? new Date(row.agreement.effective_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-500">
                      {row.agreement?.signed_doc_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/hq/branches/${row.id}/agreement`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 hover:text-yellow-900"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No branches found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
          {total} branch{total !== 1 ? 'es' : ''} total
        </div>
      </div>
    </div>
  )
}
