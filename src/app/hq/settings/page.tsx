import { createClient } from '@/lib/supabase/server'
import HQSettingsClient from './HQSettingsClient'
import TrustedDevicesCard from '@/components/TrustedDevicesCard'

export default async function HQSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: config }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, phone, role, avatar_url').eq('id', user!.id).single(),
    supabase.from('platform_config').select('*').eq('id', 1).single(),
  ])

  return (
    <div className="space-y-6">
      <HQSettingsClient profile={profile} config={config} />
      <div className="max-w-2xl px-6 pb-8"><TrustedDevicesCard /></div>
    </div>
  )
}
