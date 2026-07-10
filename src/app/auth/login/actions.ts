'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const ROLE_HOME: Record<string, string> = {
  superadmin: '/dashboard/admin',
  owner:      '/dashboard/owner',
  tenant:     '/dashboard/tenant',
  technician: '/dashboard/technician',
}

export async function signInAction(
  email: string,
  password: string,
  nextPath?: string
): Promise<{ error: string }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('banned')) {
      return { error: 'This account has been deactivated. Please contact your organization administrator.' }
    }
    return { error: error.message }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session not established. Please try again.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const dest = nextPath || ROLE_HOME[profile?.role ?? 'owner'] || '/dashboard/owner'
  redirect(dest)
}
