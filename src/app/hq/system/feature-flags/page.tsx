import { createClient } from '@/lib/supabase/server'
import HQFeatureFlagsClient from './HQFeatureFlagsClient'

export const metadata = { title: 'Feature Flags' }

export default async function HQFeatureFlagsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: flags }, { data: branches }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('platform_feature_flags').select('*').order('feature_key'),
    supabase.from('branches').select('id, display_name').in('status', ['active', 'suspended']).order('display_name'),
  ])

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
        <p className="text-sm text-gray-500 mt-0.5">Toggle platform features globally, or override per branch</p>
      </div>
      <HQFeatureFlagsClient
        flags={flags ?? []}
        branches={branches ?? []}
        isAdmin={profile?.role === 'hq_admin'}
      />
    </div>
  )
}
