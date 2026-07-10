import { createClient, createAdminClient } from '@/lib/supabase/server'
import StaffManagement from './StaffManagement'

export const metadata = { title: 'Staff Management' }

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id
  if (!orgId) return null

  const admin = createAdminClient()

  // Active staff members
  const { data: staff } = await admin
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .eq('organization_id', orgId)
    .in('role', ['property_manager', 'financial_manager'])
    .order('created_at')

  // Pending invitations
  const { data: invitations } = await admin
    .from('staff_invitations')
    .select('id, email, role, expires_at, created_at')
    .eq('organization_id', orgId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Staff Management</h2>
        <p className="text-slate-500 text-sm mt-0.5">Invite and manage your Property Managers and Financial Managers</p>
      </div>
      <StaffManagement
        staff={staff ?? []}
        invitations={invitations ?? []}
        orgId={orgId}
      />
    </div>
  )
}
