import { createClient } from '@/lib/supabase/server'
import { Building2 } from 'lucide-react'
import BranchFilterSelect from '../_components/BranchFilterSelect'
import ExportCSVButton from '../_components/ExportCSVButton'

export default async function HQPropertiesReportPage({
  searchParams,
}: { searchParams: Promise<{ branch?: string }> }) {
  const supabase  = await createClient()
  const { branch: branchId } = await searchParams

  const [{ data: branches }, { data: rawProps }] = await Promise.all([
    supabase.from('branches').select('id, display_name').in('status', ['active', 'suspended']).order('display_name'),
    supabase
      .from('properties')
      .select(`
        id, name, property_type, city, status, branch_id,
        units ( id, status ),
        branches ( display_name )
      `)
      .eq(branchId ? 'branch_id' : 'status', branchId ?? 'active')
      .not('status', 'eq', 'deleted')
      .order('name'),
  ])

  // If no branch filter, re-fetch without status filter (we used status as a dummy eq above)
  const { data: properties } = branchId
    ? { data: rawProps }
    : await supabase
        .from('properties')
        .select(`id, name, property_type, city, status, branch_id, units ( id, status ), branches ( display_name )`)
        .not('status', 'eq', 'deleted')
        .order('name')

  const rows = (properties ?? []).map(p => {
    const units   = (p.units as { id: string; status: string }[]) ?? []
    const total   = units.length
    const occupied = units.filter(u => u.status === 'occupied').length
    const occ = total > 0 ? Math.round((occupied / total) * 100) : 0
    return {
      branch:   (p.branches as { display_name: string } | null)?.display_name ?? '—',
      name:     p.name,
      type:     p.property_type ?? '—',
      city:     p.city ?? '—',
      units:    total,
      occupied,
      occ_pct:  `${occ}%`,
      status:   p.status,
    }
  })

  const csvData   = rows.map(r => ({ ...r }))
  const csvHeaders = ['Branch', 'Property', 'Type', 'City', 'Total Units', 'Occupied', 'Occupancy %', 'Status']

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties Report</h1>
          <p className="text-sm text-gray-500">All properties across branches</p>
        </div>
        <div className="flex items-center gap-2">
          <BranchFilterSelect branches={branches ?? []} selected={branchId ?? null} basePath="/hq/reports/properties" />
          <ExportCSVButton data={csvData} headers={csvHeaders} filename={`hq-properties-${new Date().toISOString().substring(0,10)}.csv`} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{rows.length} properties</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Property</th>
                <th className="px-5 py-3 text-left">Branch</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">City</th>
                <th className="px-5 py-3 text-right">Units</th>
                <th className="px-5 py-3 text-left">Occupancy</th>
                <th className="px-5 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!rows.length ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">No properties found</td></tr>
              ) : rows.map((r, i) => {
                const pct = parseInt(r.occ_pct)
                const barColor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-5 py-3 text-gray-600">{r.branch}</td>
                    <td className="px-5 py-3 text-gray-600 capitalize">{r.type}</td>
                    <td className="px-5 py-3 text-gray-600">{r.city}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{r.units}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: r.occ_pct }} />
                        </div>
                        <span className="text-xs text-gray-600">{r.occ_pct}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
