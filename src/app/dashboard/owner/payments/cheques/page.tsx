import { createClient } from '@/lib/supabase/server'
import { Receipt, ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import AddChequeForm from './AddChequeForm'
import UpdateChequeButton from './UpdateChequeButton'

export const metadata = { title: 'Cheque Tracker' }

const statusColor: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  deposited: 'bg-blue-100 text-blue-700',
  cleared:   'bg-green-100 text-green-700',
  bounced:   'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
  replaced:  'bg-purple-100 text-purple-700',
}

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
    supabase.from('contracts').select('id, tenant_id, unit_id').eq('organization_id', orgId).eq('status', 'active'),
  ])

  const cheques   = chequesRes.data  ?? []
  const tenants   = tenantsRes.data  ?? []
  const units     = unitsRes.data    ?? []
  const contracts = contractsRes.data ?? []

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

      {/* Cheque table */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Receipt size={16}/> All Cheques ({cheques.length})
        </h3>

        {cheques.length === 0 ? (
          <div className="card p-12 text-center text-slate-400 text-sm">
            No cheques registered yet. Add cheques above.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Cheque #</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Tenant</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Unit</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Bank</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Amount</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Due Date</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Seq</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cheques.map(c => {
                  const isPast = c.due_date <= today && c.status === 'pending'
                  return (
                    <tr key={c.id} className={`hover:bg-slate-50 ${isPast ? 'bg-amber-50' : ''}`}>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">{c.cheque_number}</td>
                      <td className="px-4 py-3">{(c.tenants as { full_name: string })?.full_name}</td>
                      <td className="px-4 py-3 text-slate-500">{(c.units as { unit_number: string })?.unit_number}</td>
                      <td className="px-4 py-3 text-slate-500">{c.bank_name}</td>
                      <td className="px-4 py-3 font-bold">{Number(c.amount).toLocaleString()} OMR</td>
                      <td className={`px-4 py-3 ${isPast ? 'text-amber-700 font-semibold' : 'text-slate-500'}`}>{c.due_date}</td>
                      <td className="px-4 py-3 text-slate-400 text-center">
                        {c.sequence_number && c.total_cheques ? `${c.sequence_number}/${c.total_cheques}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <UpdateChequeButton chequeId={c.id} currentStatus={c.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
