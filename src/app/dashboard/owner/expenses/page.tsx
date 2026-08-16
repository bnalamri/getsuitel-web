import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Receipt } from 'lucide-react'
import ExpensesClient from './ExpensesClient'

export const metadata = { title: 'Expenses' }

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id, role, full_name').eq('id', user.id).single()
  const orgId   = profile?.organization_id
  const userName = (profile?.full_name as string) ?? ''
  if (!orgId) return null

  const admin = createAdminClient()
  const [expensesRes, propertiesRes, unitsRes, orgRes] = await Promise.all([
    admin.from('expenses').select('*, properties(name), units(unit_number)').eq('organization_id', orgId).order('date', { ascending: false }),
    admin.from('properties').select('id, name').eq('organization_id', orgId).order('name'),
    admin.from('units').select('id, unit_number, properties(id, name)').eq('organization_id', orgId).order('unit_number'),
    admin.from('organizations').select('default_currency, name').eq('id', orgId).single(),
  ])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-xl"><Receipt size={20} className="text-red-600" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
            <p className="text-sm text-slate-500">Track property-related costs and outgoings</p>
          </div>
        </div>
      </div>
      <ExpensesClient
        expenses={expensesRes.data ?? []}
        properties={propertiesRes.data ?? []}
        units={unitsRes.data ?? []}
        defaultCurrency={(orgRes.data?.default_currency as string) ?? 'OMR'}
        orgName={(orgRes.data?.name as string) ?? ''}
        userName={userName}
      />
    </div>
  )
}
