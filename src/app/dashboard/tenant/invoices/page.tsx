import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InvoiceList from './InvoiceList'

export const metadata = { title: 'My Invoices' }

export default async function TenantInvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, organization_id')
    .eq('profile_id', user.id)
    .single()

  if (!tenant) return <div className="text-slate-400 text-center py-20">No tenant profile found.</div>

  const [invoicesRes, orgRes] = await Promise.all([
    supabase.from('invoices').select('*').eq('tenant_id', tenant.id).order('due_date', { ascending: false }),
    tenant.organization_id
      ? supabase.from('organizations')
          .select('bank_account_name, bank_account_number, bank_name, bank_iban, mobile_wallet_number, mobile_wallet_label')
          .eq('id', tenant.organization_id)
          .single()
      : Promise.resolve({ data: null }),
  ])

  const inv       = invoicesRes.data ?? []
  const org       = orgRes.data
  const totalDue  = inv.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0)
  const totalPaid = inv.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-slate-900">My Invoices</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Amount Due</div>
          <div className={`text-2xl font-bold mt-1 ${totalDue > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {totalDue.toLocaleString()} OMR
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Total Paid</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{totalPaid.toLocaleString()} OMR</div>
        </div>
      </div>

      <InvoiceList
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        invoices={inv as any}
        tenantId={tenant.id}
        orgId={tenant.organization_id}
        org={org}
      />
    </div>
  )
}
