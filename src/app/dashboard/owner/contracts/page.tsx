import { createClient, createAdminClient } from '@/lib/supabase/server'
import { FileText, ArrowRight } from 'lucide-react'
import AddContractForm from './AddContractForm'
import ContractTable from './ContractTable'
import Link from 'next/link'

export const metadata = { title: 'Contracts' }
export const dynamic = 'force-dynamic'

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single()
  const orgId = profile?.organization_id
  const canManage = profile?.role === 'owner' || profile?.role === 'property_manager'
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found</div>

  const admin = createAdminClient()

  const { data: org } = await supabase.from('organizations').select('default_currency').eq('id', orgId).single()
  const defaultCurrency = (org?.default_currency as string) ?? 'OMR'

  const [contractsRes, unitsRes, allUnitsRes, tenantsRes, propertiesRes] = await Promise.all([
    supabase.from('contracts').select('*, units(unit_number, properties(name)), tenants(full_name)').eq('organization_id', orgId).order('created_at', { ascending: false }),
    supabase.from('units').select('id, unit_number, properties(name)').eq('organization_id', orgId).eq('status', 'vacant'),
    admin.from('units').select('id, unit_number, properties(name)').eq('organization_id', orgId).order('unit_number'),
    admin.from('tenants').select('id, full_name').eq('organization_id', orgId).order('full_name'),
    supabase.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
  ])

  const contracts = contractsRes.data ?? []
  const vacantUnits = unitsRes.data ?? []
  const allUnits = allUnitsRes.data ?? []
  const tenants = tenantsRes.data ?? []
  const properties = propertiesRes.data ?? []

  const hasUnits = vacantUnits.length > 0
  const hasTenants = tenants.length > 0
  const canAddContract = hasUnits && hasTenants

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contracts</h2>
          <p className="text-slate-500 text-sm mt-0.5">{contracts.length} contracts</p>
        </div>
        {canAddContract && canManage && <AddContractForm orgId={orgId} units={vacantUnits as never} tenants={tenants} defaultCurrency={defaultCurrency} />}
      </div>

      {!hasUnits ? (
        <div className="card p-16 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">Set up properties and units first</h3>
          <p className="text-slate-400 text-sm mb-6">You need at least one unit before creating a contract.</p>
          <Link href="/dashboard/owner/properties" className="btn-primary inline-flex items-center gap-2">
            Go to Properties <ArrowRight size={14} />
          </Link>
        </div>
      ) : !hasTenants ? (
        <div className="card p-16 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">Add tenants first</h3>
          <p className="text-slate-400 text-sm mb-6">You need at least one tenant before creating a contract.</p>
          <Link href="/dashboard/owner/tenants" className="btn-primary inline-flex items-center gap-2">
            Go to Tenants <ArrowRight size={14} />
          </Link>
        </div>
      ) : contracts.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">No contracts yet</h3>
          <p className="text-slate-400 text-sm">Create a contract to link a tenant to a unit.</p>
        </div>
      ) : (
        <ContractTable contracts={contracts as never} tenants={tenants} allUnits={allUnits as never} canManage={canManage} properties={properties} />
      )}
    </div>
  )
}
