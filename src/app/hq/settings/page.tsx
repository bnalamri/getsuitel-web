import { createClient } from '@/lib/supabase/server'
import HQSettingsClient from './HQSettingsClient'

export default async function HQSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: config }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, avatar_url').eq('id', user!.id).single(),
    supabase.from('platform_config').select('*').eq('id', 1).single(),
  ])

  return <HQSettingsClient profile={profile} config={config} />
}
