import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Receipt } from 'lucide-react'
import AddInvoiceForm from './AddInvoiceForm'
import EditInvoiceForm from './EditInvoiceForm'
import MarkPaidButton from './MarkPaidButton'

export const metadata = { title: 'Invoices' }
export const dynamic = 'force-dynamic'

const statusColor: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  canceled: 'bg-slate-100 text-slate-400',
}

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return <div className="text-slate-400 text-center py-20">No organization found</div>

  const admin = createAdminClient()

  const { data: org } = await supabase.from('organizations').select('default_currency').eq('id', orgId).single()
  const defaultCurrency = (org?.default_currency as string) ?? 'OMR'

  const [invoicesRes, tenantsRes, unitsRes] = await Promise.all([
    supabase.from('invoices').select('*, tenants(full_name), units(unit_number, properties(name))').eq('organization_id', orgId).order('created_at', { ascending: false }),
    admin.from('tenants').select('id, full_name, email, contracts(unit_id, status)').eq('organization_id', orgId).order('full_name'),
    supabase.from('units').select('id, unit_number, properties(name)').eq('organization_id', orgId),
  ])

  const invoices = invoicesRes.data ?? []
  const tenants = tenantsRes.data ?? []
  const units = unitsRes.data ?? []

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const totalPending = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Invoices</h2>
          <p className="text-slate-500 text-sm mt-0.5">{invoices.length} invoices</p>
        </div>
        <AddInvoiceForm orgId={orgId} tenants={tenants} units={units as never} defaultCurrency={defaultCurrency} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Collected</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{totalPaid.toLocaleString()} {defaultCurrency}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Pending</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{totalPending.toLocaleString()} {defaultCurrency}</div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="card p-16 text-center">
          <Receipt size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 mb-1">No invoices yet</h3>
          <p className="text-slate-400 text-sm">Create invoices to track rent and other payments.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Tenant</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Unit</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Type</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Amount</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Due Date</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map(inv => {
                const tenant = inv.tenants as { full_name: string } | null
                const unit = inv.units as { unit_number: string; properties: { name: string } | null } | null
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{tenant?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      <div>{unit?.properties?.name}</div>
                      <div className="text-slate-400">Unit {unit?.unit_number}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{inv.type}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{Number(inv.amount).toLocaleString()} {inv.currency}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.due_date}</td>
                    <td className="px-4 py-3"><span className={`badge ${statusColor[inv.status]}`}>{inv.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <EditInvoiceForm
                          invoice={{ id: inv.id, tenant_id: inv.tenant_id, unit_id: inv.unit_id, type: inv.type, amount: Number(inv.amount), currency: inv.currency, due_date: inv.due_date, status: inv.status, notes: inv.notes }}
                          tenants={tenants}
                          units={units as never}
                        />
                        {['sent', 'overdue', 'draft'].includes(inv.status) && (
                          <MarkPaidButton invoiceId={inv.id} />
                        )}
                      </div>
                    </td>
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
