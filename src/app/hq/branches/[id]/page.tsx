import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Users, Home, FileText, TrendingUp } from 'lucide-react'
import OmrSymbol from '@/components/ui/OmrSymbol'
import BranchActions from './BranchActions'

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  archived:  'bg-gray-100 text-gray-500',
}

export default async function BranchDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Fetch branch + superadmin profile
  const { data: branch } = await supabase
    .from('branches')
    .select(`
      id, name, display_name, region, city, status,
      license_fee_omr, revenue_share_pct, logo_url, created_at, updated_at,
      superadmin_id,
      profiles!branches_superadmin_id_fkey ( full_name, email, phone )
    `)
    .eq('id', params.id)
    .single()

  if (!branch) notFound()

  // Parallel stats queries
  const [
    { count: orgCount },
    { count: propCount },
    { count: tenantCount },
    { data: billing },
  ] = await Promise.all([
    supabase
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', params.id),

    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', params.id),

    supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .in(
        'organization_id',
        (await supabase.from('organizations').select('id').eq('branch_id', params.id)).data?.map(o => o.id) ?? []
      ),

    supabase
      .from('branch_billing')
      .select('month, total_revenue_omr, share_amount_omr, license_fee_omr, status')
      .eq('branch_id', params.id)
      .order('month', { ascending: false })
      .limit(6),
  ])

  const totalRevenue = billing?.reduce((s, r) => s + Number(r.total_revenue_omr), 0) ?? 0
  const profile = branch.profiles as { full_name: string | null; email: string; phone?: string | null } | null

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Back + header */}
      <div>
        <Link href="/hq/branches" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Branches
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{branch.display_name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[branch.status] ?? ''}`}>
                {branch.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {[branch.city, branch.region].filter(Boolean).join(', ') || 'No location set'}
              {' · '}Created {new Date(branch.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <BranchActions
            branchId={branch.id}
            branchName={branch.display_name}
            currentStatus={branch.status as 'active' | 'suspended' | 'archived'}
            orgCount={orgCount ?? 0}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Organisations', value: orgCount ?? 0, icon: Building2, color: 'blue' },
          { label: 'Properties',    value: propCount ?? 0, icon: Home,      color: 'emerald' },
          { label: 'Tenants',       value: tenantCount ?? 0, icon: Users,   color: 'purple' },
          { label: 'Total Revenue (6 mo)', value: null, omr: totalRevenue, icon: TrendingUp, color: 'amber' },
        ].map(({ label, value, omr, icon: Icon, color }) => (
          <div key={label} className={`bg-white rounded-xl border border-gray-200 p-4`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
              color === 'blue'    ? 'bg-blue-50'    :
              color === 'emerald'? 'bg-emerald-50'  :
              color === 'purple' ? 'bg-purple-50'   : 'bg-amber-50'
            }`}>
              <Icon className={`w-5 h-5 ${
                color === 'blue'    ? 'text-blue-600'    :
                color === 'emerald'? 'text-emerald-600'  :
                color === 'purple' ? 'text-purple-600'   : 'text-amber-600'
              }`} />
            </div>
            {omr !== undefined ? (
              <div className="text-xl font-bold text-gray-900 flex items-center gap-1">
                <OmrSymbol size={18} variant="dark" />
                {omr.toFixed(3)}
              </div>
            ) : (
              <div className="text-2xl font-bold text-gray-900">{value}</div>
            )}
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Two-column detail */}
      <div className="grid sm:grid-cols-2 gap-5">

        {/* Superadmin info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Superadmin</h2>
          {profile ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                  {(profile.full_name ?? profile.email)[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{profile.full_name ?? '—'}</div>
                  <div className="text-xs text-gray-400">{profile.email}</div>
                </div>
              </div>
              {profile.phone && (
                <div className="text-sm text-gray-600">📞 {profile.phone}</div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No superadmin assigned yet</p>
          )}
        </div>

        {/* Commercial terms */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Commercial Terms</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">License Fee / month</dt>
              <dd className="font-semibold text-gray-900 flex items-center gap-1">
                <OmrSymbol size={13} variant="dark" />
                {Number(branch.license_fee_omr).toFixed(3)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Revenue Share</dt>
              <dd className="font-semibold text-gray-900">{branch.revenue_share_pct}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Last Updated</dt>
              <dd className="text-gray-600">
                {new Date(branch.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Billing history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Billing History <span className="text-gray-400 font-normal text-sm">(last 6 months)</span></h2>
        </div>
        {(billing ?? []).length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No billing records yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Month</th>
                  <th className="px-5 py-3 text-right">Total Revenue</th>
                  <th className="px-5 py-3 text-right">HQ Share</th>
                  <th className="px-5 py-3 text-right">License Fee</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {billing!.map(row => (
                  <tr key={row.month} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-700 font-medium">
                      {new Date(row.month).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-900 font-semibold">
                      <span className="flex items-center justify-end gap-1">
                        <OmrSymbol size={12} variant="dark" />
                        {Number(row.total_revenue_omr).toFixed(3)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      <span className="flex items-center justify-end gap-1">
                        <OmrSymbol size={12} variant="dark" />
                        {Number(row.share_amount_omr).toFixed(3)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      <span className="flex items-center justify-end gap-1">
                        <OmrSymbol size={12} variant="dark" />
                        {Number(row.license_fee_omr).toFixed(3)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        row.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
