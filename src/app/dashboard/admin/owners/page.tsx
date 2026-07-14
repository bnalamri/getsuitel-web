import { createAdminClient } from '@/lib/supabase/server'
import { Shield } from 'lucide-react'
import { unstable_noStore as noStore } from 'next/cache'
import OwnersFilter from './OwnersFilter'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Owners' }

export default async function OwnersPage() {
  noStore()
  const admin = createAdminClient()

  const { data: orgs } = await admin
    .from('organizations')
    .select('*, profiles!organizations_owner_id_fkey(full_name, email, phone, national_id)')
    .order('created_at', { ascending: false })

  const orgIds = (orgs ?? []).map(o => o.id)
  const [propsRes, unitsRes, tenantsRes] = orgIds.length > 0 ? await Promise.all([
    admin.from('properties').select('id, organization_id').in('organization_id', orgIds),
    admin.from('units').select('id, organization_id').in('organization_id', orgIds),
    admin.from('tenants').select('id, organization_id').in('organization_id', orgIds),
  ]) : [{ data: [] }, { data: [] }, { data: [] }]

  const buildMap = (rows: { id: string; organization_id: string }[] | null) =>
    (rows ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.organization_id] = (acc[r.organization_id] ?? 0) + 1
      return acc
    }, {})

  const counts = {
    props:   buildMap(propsRes.data as never),
    units:   buildMap(unitsRes.data as never),
    tenants: buildMap(tenantsRes.data as never),
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Owners</h2>
        <p className="text-slate-500 text-sm mt-0.5">{orgs?.length ?? 0} organizations</p>
      </div>

      {(orgs ?? []).length === 0 ? (
        <div className="card p-16 text-center">
          <Shield size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700">No organizations yet</h3>
        </div>
      ) : (
        <OwnersFilter orgs={(orgs ?? []) as never} counts={counts} />
      )}
    </div>
  )
}
