import { createClient } from '@/lib/supabase/server'
import SuspendedClient from './SuspendedClient'

export const metadata = { title: 'Branch Suspended — GetSuitel' }

export default async function SuspendedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <SuspendedClient userEmail={user?.email ?? ''} />
}
