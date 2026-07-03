import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?debug=nouser')

  // Fetch profile and organization separately to avoid RLS join issues
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect(`/auth/login?debug=noprofile&uid=${user.id}&err=${encodeURIComponent(profileErr?.message ?? 'unknown')}`)

  // Fetch org only if the user belongs to one
  let organization = null
  if (profile.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .single()
    organization = org
  }

  return (
    <DashboardShell profile={{ ...profile, organizations: organization }}>
      {children}
    </DashboardShell>
  )
}
