import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import AddChequeForm from './AddChequeForm'
import ChequeTable from './ChequeTable'

export const metadata = { title: 'Cheque Tracker' }

export default async function ChequesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found</div>

  const [chequesRes, tenantsRes, unitsRes, contractsRes] = await Promise.all([
    supabase.from('cheques')
      .select('*, tenants(full_name), units(unit_number), contracts(id)')
      .eq('organization_id', orgId)
      .order('due_date', { ascending: true }),
    supabase.from('tenants').select('id, full_name').eq('organization_id', orgId),
    supabase.from('units').select('id, unit_number, properties(name)').eq('organization_id', orgId),
    supabase.from('contracts').select('id, tenant_id, unit_id, payment_method').eq('organization_id', orgId).eq('status', 'active').eq('payment_method', 'cheque'),
  ])

  const cheques   = chequesRes.data  ?? []
  const tenants   = tenantsRes.data  ?? []
  const contracts = contractsRes.data ?? []

  // Only units with an active cheque contract, sorted alphabetically
  const chequeUnitIds = new Set(contracts.map((c: { unit_id: string }) => c.unit_id))
  const units = (unitsRes.data ?? [])
    .filter((u: { id: string }) => chequeUnitIds.has(u.id))
    .sort((a: { unit_number: string }, b: { unit_number: string }) => a.unit_number.localeCompare(b.unit_number))

  const today     = new Date().toISOString().split('T')[0]
  const bounced   = cheques.filter(c => c.status === 'bounced')
  const dueSoon   = cheques.filter(c => c.status === 'pending' && c.due_date <= today)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/owner/payments" className="text-slate-400 hover:text-slate-700">
          <ArrowLeft size={18}/>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cheque Tracker</h2>
          <p className="text-slate-500 text-sm mt-0.5">Register post-dated cheques and track their status</p>
        </div>
      </div>

      {/* Alerts */}
      {(bounced.length > 0 || dueSoon.length > 0) && (
        <div className="space-y-2">
          {bounced.length > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle size={15} className="flex-shrink-0"/>
              <span><strong>{bounced.length}</strong> bounced cheque{bounced.length > 1 ? 's' : ''} require attention</span>
            </div>
          )}
          {dueSoon.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle size={15} className="flex-shrink-0"/>
              <span><strong>{dueSoon.length}</strong> cheque{dueSoon.length > 1 ? 's' : ''} due today or overdue</span>
            </div>
          )}
        </div>
      )}

      {/* Add new cheque(s) */}
      <AddChequeForm orgId={orgId} tenants={tenants} units={units} contracts={contracts} />

      {/* Cheque table with filter */}
      <ChequeTable cheques={cheques as never} units={units as never} />
    </div>
  )
}
