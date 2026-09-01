import { createClient } from '@/lib/supabase/server'
import HQSettingsClient from './HQSettingsClient'

export default async function HQSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: config }, { data: flags }, { data: branches }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, role, avatar_url').eq('id', user!.id).single(),
    supabase.from('platform_config').select('*').eq('id', 1).single(),
    supabase.from('platform_feature_flags').select('*').order('feature_key'),
    supabase.from('branches').select('id, display_name').in('status', ['active', 'suspended']).order('display_name'),
  ])

  return <HQSettingsClient profile={profile} config={config} flags={flags ?? []} branches={branches ?? []} />
}
