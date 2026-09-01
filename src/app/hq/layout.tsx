import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HQShell from '@/components/layout/HQShell'

export default async function HQLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile || !['hq_admin', 'hq_staff', 'hq_finance'].includes(profile.role)) redirect('/auth/login')

  return <HQShell profile={profile}>{children}</HQShell>
}
