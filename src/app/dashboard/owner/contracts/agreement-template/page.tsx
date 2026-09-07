import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TenancyTemplateClient from './TenancyTemplateClient'

export const metadata = { title: 'Tenancy Agreement Template' }
export const dynamic = 'force-dynamic'

export default async function TenancyTemplatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'property_manager'].includes(profile.role) || !profile.organization_id) {
    redirect('/dashboard/owner/contracts')
  }

  const { data: template } = await supabase
    .from('tenancy_agreement_templates')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  return <TenancyTemplateClient initialData={template} />
}
