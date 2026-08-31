import { createClient } from '@/lib/supabase/server'
import { Settings } from 'lucide-react'
import HQSettingsClient from './HQSettingsClient'

export default async function HQSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('id', user!.id)
    .single()

  return <HQSettingsClient profile={profile} />
}
