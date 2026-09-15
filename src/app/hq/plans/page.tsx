import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HQPlansClient from './HQPlansClient'

export const metadata = { title: 'Plans & Pricing' }

export default async function HQPlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'hq_admin') redirect('/hq')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <HQPlansClient />
    </div>
  )
}
