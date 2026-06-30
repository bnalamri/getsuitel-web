import { createClient } from '@/lib/supabase/server'
import { DoorOpen, Plus } from 'lucide-react'
import AddUnitForm from './AddUnitForm'

export const metadata = { title: 'Units' }

const statusColor: Record<string, string> = {
  vacant: 'bg-green-100 text-green-700',
  occupied: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-orange-100 text-orange-700',
  reserved: 'bg-purple-100 text-purple-700',
}

export default async function UnitsPage({ searchParams }: { searchParams: { property?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found</div>

  const { data: properties } = await supabase.from('properties').select('id, name').eq('organization_id', orgId).order('name')

  let query = supabase.from('units').select('*, properties(name)').eq('organization_id', orgId).order('created_at', { ascending: false })
  if (searchParams.property) query = query.eq('property_id', searchParams.property)
  const { data: units } = await query

  const selectedProperty = properties?.find(p => p.id === searchParams.property)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Units {selectedProperty ? `— ${selectedProperty.name}` : ''}</h2>
          <p className="text-slate-500 text-sm mt-0.5">{units?.length ?? 0} units</p>
        </div>
        <AddUnitForm orgId={orgId} properties={properties ?? []} defaultPropertyId={searchParams.property} />
      </div>

      {/* Filter by property */}
      {(properties?.length ?? 0) > 1 && (
        <div className="flex gap-2 flex-wrap">
          <a href="/dashboard/owner/units" className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!searchParams.property ? 'bg-navy-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>All</a>
          {properties?.map(p => (
            <a key={p.id} href={`/dashboard/owner/units?property=${p.id}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${searchParams.property === p.id ? 'bg-navy-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {p.name}
            </a>
          ))}
        </div>
      )}

      {units?.length === 0 ? (
        <div className="card p-16 text-center">
          <DoorOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">No units yet</h3>
          <p className="text-slate-400 text-sm mb-4">Add units to your properties to start renting.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Unit</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Property</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Details</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Rent</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units?.map(u => {
                const prop = u.properties as { name: string } | null
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">Unit {u.unit_number}</td>
                    <td className="px-4 py-3 text-slate-600">{prop?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {u.bedrooms != null ? `${u.bedrooms}BR` : '—'}
                      {u.area_sqm ? ` · ${u.area_sqm}m²` : ''}
                      {u.floor != null ? ` · Floor ${u.floor}` : ''}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{Number(u.rent_amount).toLocaleString()} {u.currency}</td>
                    <td className="px-4 py-3"><span className={`badge ${statusColor[u.status]}`}>{u.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
