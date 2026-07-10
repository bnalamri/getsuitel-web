import { createClient } from '@/lib/supabase/server'
import { Building2, Plus, MapPin, DoorOpen } from 'lucide-react'
import Link from 'next/link'
import AddPropertyForm from './AddPropertyForm'

export const metadata = { title: 'Properties' }

export default async function PropertiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single()
  const orgId = profile?.organization_id
  const isOwner = profile?.role === 'owner'

  if (!orgId) {
    return (
      <div className="text-center py-20 text-slate-400">
        <Building2 size={40} className="mx-auto mb-3" />
        <p>Set up your organization first in <Link href="/dashboard/owner/settings" className="text-navy-700 underline">Settings</Link></p>
      </div>
    )
  }

  const { data: properties } = await supabase
    .from('properties')
    .select('*, units(id, status)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  const typeColor: Record<string, string> = {
    residential: 'bg-blue-100 text-blue-700',
    commercial: 'bg-purple-100 text-purple-700',
    mixed: 'bg-teal-100 text-teal-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Properties</h2>
          <p className="text-slate-500 text-sm mt-0.5">{properties?.length ?? 0} properties</p>
        </div>
        {isOwner && <AddPropertyForm orgId={orgId} />}
      </div>

      {properties?.length === 0 ? (
        <div className="card p-16 text-center">
          <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">No properties yet</h3>
          <p className="text-slate-400 text-sm mb-4">Add your first property to start managing units and tenants.</p>
          {isOwner && <AddPropertyForm orgId={orgId} inline />}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {properties?.map(p => {
            const units = p.units as { id: string; status: string }[]
            const occupied = units?.filter(u => u.status === 'occupied').length ?? 0
            const total = units?.length ?? 0
            const occupancy = total > 0 ? Math.round((occupied / total) * 100) : 0
            return (
              <Link key={p.id} href={`/dashboard/owner/units?property=${p.id}`}
                className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{p.name}</h3>
                    <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                      <MapPin size={11} />{p.city}, {p.country}
                    </div>
                  </div>
                  <span className={`badge ml-2 ${typeColor[p.type] ?? 'bg-slate-100 text-slate-600'}`}>{p.type}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                  <span className="flex items-center gap-1"><DoorOpen size={14} />{total} units</span>
                  <span>{occupied} occupied</span>
                </div>
                {total > 0 && (
                  <div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-navy-700 rounded-full" style={{ width: `${occupancy}%` }} />
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{occupancy}% occupied</div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
