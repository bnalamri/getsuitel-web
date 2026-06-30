import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TenantSettingsForm from './TenantSettingsForm'

export const metadata = { title: 'Settings' }

export default async function TenantSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: tenant } = await supabase.from('tenants').select('*').eq('profile_id', user.id).single()

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
      <TenantSettingsForm profile={profile} tenant={tenant} />
    </div>
  )
}
