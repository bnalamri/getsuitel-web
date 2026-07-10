import { createClient, createAdminClient } from '@/lib/supabase/server'
import OrgSettingsForm from './OrgSettingsForm'
import ProfileSettingsForm from './ProfileSettingsForm'
import PaymentSettingsForm from './PaymentSettingsForm'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const role = profile?.role as string ?? 'owner'
  const isStaff = role === 'property_manager' || role === 'financial_manager'

  // Use admin client so staff can also read their org (RLS only allows owners directly)
  const admin = createAdminClient()
  const { data: org } = profile?.organization_id
    ? await admin.from('organizations').select('*').eq('id', profile.organization_id).single()
    : { data: null }

  // Fetch platform default currency (used as fallback for new orgs)
  let platformCurrency = 'OMR'
  try {
    const { data: ps } = await admin.from('platform_settings').select('value').eq('key', 'default_currency').single()
    if (ps?.value) platformCurrency = ps.value
  } catch { /* table may not exist yet */ }

  // Always use auth user email; fall back to registration metadata for new users
  const displayProfile = {
    ...(profile ?? {}),
    id: user.id,
    email: user.email,
    full_name: (profile?.full_name as string) || (user.user_metadata?.full_name as string) || '',
    phone: (profile?.phone as string) || (user.user_metadata?.phone as string) || '',
  }

  const subtitle = isStaff
    ? `Manage your profile · ${org?.name ?? 'Organization'}`
    : 'Manage your profile and organization'

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>
      </div>

      <ProfileSettingsForm profile={displayProfile} />
      {!isStaff && (
        <>
          <OrgSettingsForm org={org} userId={user.id} orgId={profile?.organization_id ?? null} platformCurrency={platformCurrency} />
          <PaymentSettingsForm org={org} orgId={profile?.organization_id ?? null} />
        </>
      )}
    </div>
  )
}
