import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HQBackupsClient from './HQBackupsClient'

export const metadata = { title: 'Platform Backups' }

export default async function HQBackupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'hq_admin') redirect('/hq')

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Backups</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Daily full-database export — the free-tier stand-in for Supabase&apos;s Daily Backups feature. Kept 14 days.
        </p>
      </div>
      <HQBackupsClient />
    </div>
  )
}
