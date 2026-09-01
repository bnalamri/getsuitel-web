import { createAdminClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'
import BranchFilterSelect from '../_components/BranchFilterSelect'
import ExportCSVButton from '../_components/ExportCSVButton'

export default async function HQTenantsReportPage({
  searchParams,
}: { searchParams: Promise<{ branch?: string }> }) {
  const supabase = createAdminClient()
  const { branch: branchId } = await searchParams

  const { data: branches } = await supabase
    .from('branches').select('id, display_name').in('status', ['active', 'suspended']).order('display_name')

  // Get all active contracts with nested tenant + unit + property + org + branch
  let query = supabase
    .from('contracts')
    .select(`
      id, status, monthly_rent, start_date, end_date,
      tenants ( full_name, email, phone ),
      units ( unit_number, properties ( name, branch_id, branches ( display_name ) ) )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (branchId) {
    // Filter through the nested path — fetch all then filter client-side
  }

  const { data: contracts } = await query

  type ContractRow = {
    id: string; status: string; monthly_rent: number; start_date: string; end_date: string
    tenants: { full_name: string; email: string; phone: string | null } | null
    units: { unit_number: string; properties: { name: string; branch_id: string | null; branches: { display_name: string } | null } | null } | null
  }

  let rows = ((contracts ?? []) as ContractRow[]).map(c => ({
    id:           c.id,
    tenant:       c.tenants?.full_name ?? '—',
    email:        c.tenants?.email ?? '—',
    phone:        c.tenants?.phone ?? '—',
    unit:         c.units?.unit_number ?? '—',
    property:     c.units?.properties?.name ?? '—',
    branch:       c.units?.properties?.branches?.display_name ?? '—',
    branch_id:    c.units?.properties?.branch_id ?? null,
    rent:         Number(c.monthly_rent).toFixed(3),
    status:       c.status,
    start:        c.start_date ? new Date(c.start_date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—',
    end:          c.end_date   ? new Date(c.end_date).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—',
    expiring:     c.end_date ? (new Date(c.end_date) < new Date(Date.now() + 30*24*60*60*1000)) : false,
  }))

  if (branchId) rows = rows.filter(r => r.branch_id === branchId)

  const csvData    = rows.map(({ branch_id: _, expiring: __, id: ___, ...r }) => r)
  const csvHeaders = ['Tenant', 'Email', 'Phone', 'Unit', 'Property', 'Branch', 'Rent (OMR)', 'Status', 'Start', 'End']

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants Report</h1>
          <p className="text-sm text-gray-500">All active contracts across branches</p>
        </div>
        <div className="flex items-center gap-2">
          <BranchFilterSelect branches={branches ?? []} selected={branchId ?? null} basePath="/hq/reports/tenants" />
          <ExportCSVButton data={csvData} headers={csvHeaders} filename={`hq-tenants-${new Date().toISOString().substring(0,10)}.csv`} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{rows.length} contracts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Tenant</th>
                <th className="px-5 py-3 text-left">Branch</th>
                <th className="px-5 py-3 text-left">Property / Unit</th>
                <th className="px-5 py-3 text-right">Rent</th>
                <th className="px-5 py-3 text-left">Contract</th>
                <th className="px-5 py-3 text-left">Ends</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!rows.length ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No contracts found</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 ${r.expiring ? 'bg-amber-50/40' : ''}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{r.tenant}</p>
                    <p className="text-xs text-gray-400">{r.email}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{r.branch}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {r.property} <span className="text-gray-400">· {r.unit}</span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-700">{r.rent}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      r.status === 'active' ? 'bg-green-100 text-green-700'
                      : r.status === 'expired' ? 'bg-gray-100 text-gray-500'
                      : 'bg-yellow-100 text-yellow-700'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {r.end}
                    {r.expiring && <span className="ml-2 text-xs text-amber-600 font-semibold">Expiring soon</span>}
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
