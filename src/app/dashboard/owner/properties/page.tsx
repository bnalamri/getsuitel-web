import { createClient } from '@/lib/supabase/server'
import { Building2 } from 'lucide-react'
import Link from 'next/link'
import AddPropertyForm from './AddPropertyForm'
import PropertiesTable from './PropertiesTable'
import EditPropertyForm from './EditPropertyForm'
import DeletePropertyButton from './DeletePropertyButton'

export const metadata = { title: 'Properties' }

export default async function PropertiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single()
  const orgId = profile?.organization_id
  const isOwner = profile?.role === 'owner'
  const canManage = isOwner || profile?.role === 'property_manager'

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
        <PropertiesTable
          properties={(properties ?? []) as never}
          canManage={canManage}
          isOwner={isOwner}
        />
      )}
    </div>
  )
}
